const fs            = require("fs")
const Jimp            = require("jimp")
const jpeg            = require("jpeg-js")
const mean            = require('lodash/fp/mean')
const includes        = require('lodash/fp/includes')
const drop           = require('lodash/fp/drop')
const contains           = require('lodash/fp/contains')
const negate           = require('lodash/fp/negate')
const take           = require('lodash/fp/take')
const split           = require('lodash/fp/split')
const join           = require('lodash/fp/join')
const flow           = require('lodash/fp/flow')
const _ = require('lodash')
const request         = require("request")
const DelimiterStream = require('delimiter-stream')

const noStartJpeg = flow(contains('ffd8'), negate)
const noEndJpeg = flow(contains('ffd9'), negate)
const extractHeaders = flow([split('\n'), take(1), join('\n')])
const stripHeaders = flow([split('\n'), drop(1), join('\n')])

const JPEG_START_OF_IMAGE = new Buffer('ffd8', 'hex')
const JPEG_END_OF_IMAGE = new Buffer('ffd9', 'hex')
const RED_OFFSET = 50
// const dStream = new DelimiterStream({
//   delimiter: '--BoundaryString'
// })

let buffer = new Buffer(0)

const onImage = (image) => {
  const x_values = []

  image.scan(0, 0, image.bitmap.width, image.bitmap.height, (x, y, idx) => {
    const red   = image.bitmap.data[ idx + 0 ]
    const green = image.bitmap.data[ idx + 1 ]
    const blue  = image.bitmap.data[ idx + 2 ]

    if (red > (green + RED_OFFSET) && red > (blue + RED_OFFSET)) {
      image.bitmap.data[ idx + 0 ] = 255
      image.bitmap.data[ idx + 1 ] = 0
      image.bitmap.data[ idx + 2 ] = 0
      x_values.push(x)
    }
  })

  // image.write('test.jpg')
  // console.log('mean', mean(x_values))
  // console.log('direction:', (mean(x_values) - (image.bitmap.width / 2)) / image.bitmap.width)
}

const onData = (data) => {
  buffer = Buffer.concat([buffer, data])
  if (!buffer.includes(JPEG_START_OF_IMAGE) || !buffer.includes(JPEG_END_OF_IMAGE)) return

  const start = buffer.indexOf(JPEG_START_OF_IMAGE)
  const end = buffer.indexOf(JPEG_END_OF_IMAGE) + 4
  const image = buffer.slice(start, end)
  buffer = buffer.slice(end)

  Jimp.read(image, (error, image) => {
    if (error) throw error
    if (!image) return
    onImage(image)
  })
}

request
  .get('http://192.168.86.55:8081/')
  .on('data', onData)


//   Jimp.read(data, (error, image) => {
//     if(error) {
//       console.error(error.stack)
//       process.exit(0)
//     }
//
//     const x_values = []
//
//     image.scan(0, 0, image.bitmap.width, image.bitmap.height, (x, y, idx) => {
//       const red   = image.bitmap.data[ idx + 0 ]
//       const green = image.bitmap.data[ idx + 1 ]
//       const blue  = image.bitmap.data[ idx + 2 ]
//
//       if (red > (green + RED_OFFSET) && red > (blue + RED_OFFSET)) {
//         image.bitmap.data[ idx + 0 ] = 255
//         image.bitmap.data[ idx + 1 ] = 0
//         image.bitmap.data[ idx + 2 ] = 0
//         x_values.push(x)
//       }
//     })
//
//     image.write('test.jpg')
//     console.log('mean', mean(x_values))
//     console.log('direction:', (mean(x_values) - (image.bitmap.width / 2)) / image.bitmap.width)
//   })
// })
