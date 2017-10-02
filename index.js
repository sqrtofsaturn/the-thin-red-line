const fs              = require("fs")
const Jimp            = require("jimp")
const mean            = require('lodash/fp/mean')
const includes        = require('lodash/fp/includes')
const drop            = require('lodash/fp/drop')
const contains        = require('lodash/fp/contains')
const negate          = require('lodash/fp/negate')
const take            = require('lodash/fp/take')
const split           = require('lodash/fp/split')
const join            = require('lodash/fp/join')
const flow            = require('lodash/fp/flow')
const bindAll         = require('lodash/fp/bindAll')
const _               = require('lodash')
const request         = require("request")
const DelimiterStream = require('delimiter-stream')
const {EventEmitter}  = require('events')

const noStartJpeg = flow(contains('ffd8'), negate)
const noEndJpeg = flow(contains('ffd9'), negate)
const extractHeaders = flow([split('\n'), take(1), join('\n')])
const stripHeaders = flow([split('\n'), drop(1), join('\n')])

const JPEG_START_OF_IMAGE = new Buffer('ffd8', 'hex')
const JPEG_END_OF_IMAGE = new Buffer('ffd9', 'hex')
const RED_OFFSET = 50

class RedLineFinder  extends EventEmitter {
  constructor ({imageStreamUrl}) {
    super()
    bindAll(Object.getOwnPropertyNames(RedLineFinder.prototype), this)
    if(!imageStreamUrl) throw new Error("imageStreamUrl is required")
    this.imageStreamUrl = imageStreamUrl
    this.buffer = new Buffer(0)
    this.redOffset = 0
  }

  do() {
    request
      .get(this.imageStreamUrl)
      .on('data', this.onData)
  }

  onImage (image) {
    const xValues = []
    const redValues = []

    image.scan(0, 0, image.bitmap.width, image.bitmap.height, (x, y, idx) => {
      const red   = image.bitmap.data[ idx + 0 ]
      const green = image.bitmap.data[ idx + 1 ]
      const blue  = image.bitmap.data[ idx + 2 ]
      if (red > 0) {
        redValues.push(red / (green + blue + red))
      }

      if (red > ((RED_OFFSET + blue + green + red) * this.redOffset)) {
        image.bitmap.data[ idx + 0 ] = (255 * (this.redOffset - 0.20) * 5)
        image.bitmap.data[ idx + 1 ] = 0
        image.bitmap.data[ idx + 2 ] = 0
        xValues.push(x)
      }
    })
    // image.write('test.jpg')
    this.redOffset = mean(redValues)
    // console.log(this.redOffset)
    this.emit('data', (mean(xValues) - (image.bitmap.width / 2)) / image.bitmap.width)
  }

  onData (data) {
    this.buffer = Buffer.concat([this.buffer, data])
    if (!this.buffer.includes(JPEG_START_OF_IMAGE) || !this.buffer.includes(JPEG_END_OF_IMAGE)) return

    const start = this.buffer.indexOf(JPEG_START_OF_IMAGE)
    const end = this.buffer.indexOf(JPEG_END_OF_IMAGE) + 4
    const image = this.buffer.slice(start, end)
    this.buffer = this.buffer.slice(end)

    Jimp.read(image, (error, image) => {
      if (error) throw error
      if (!image) return
      this.onImage(image)
    })
  }
}

module.exports = RedLineFinder
