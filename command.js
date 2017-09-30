const RedLine = require('.')

const r = new RedLine({imageStreamUrl: 'http://bill.local:8081'})

r.on('data', console.log)

r.do()
