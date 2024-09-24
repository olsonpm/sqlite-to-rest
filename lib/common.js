'use strict'

//------//
// Main //
//------//

const fs = require('fs')

//------//
// Main //
//------//

const isSqlite3FileSync = (fpath) => {
  let res
  try {
    const fd = fs.openSync(fpath, 'r')
    const b = Buffer.alloc(16)
    fs.readSync(fd, b, 0, 16, 0)
    res =
      b.toString().toLowerCase() ===
      'sqlite format 3' + String.fromCharCode('0x00')
  } catch (e) {
    res = false
  }
  return res
}

const isDirectorySync = (fpath) => {
  return fs.statSync(fpath).isDirectory()
}

//---------//
// Exports //
//---------//

module.exports = {
  isDirectorySync,
  isSqlite3FileSync,
}
