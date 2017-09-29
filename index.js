const Jimp = require("jimp")
const mean = require('lodash/fp/mean')

class FindLine {
  constructor(filename) {
    this.filename = filename
  }
}

module.exports = FindLine

const RED_OFFSET = 50

Jimp.read("./images/01-20170929223451-16.jpg", (error, image) => {
  if(error) {
    console.error(error.stack)
    process.exit(0)
  }

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

  image.write('test.jpg')
  console.log('mean', mean(x_values))
  console.log('direction:', (mean(x_values) - (image.bitmap.width / 2)) / image.bitmap.width)
})
