'use strict'

//------//
// Main //
//------//

const res = {
  beer_per_brewery: getBeer_per_brewery(),
  beer: getBeer(),
}

//-------------//
// Helper Fxns //
//-------------//

function getBeer_per_brewery() {
  return {
    statusCode: 405,
    body: 'Method Not Allowed',
    headers: {
      allow: 'HEAD, GET',
      'content-length': '18',
      'content-type': 'text/plain; charset=utf-8',
    },
  }
}

function getBeer() {
  return {
    statusCode: 405,
    body: 'Method Not Allowed',
    headers: {
      allow: 'HEAD, GET, POST, DELETE',
      'content-length': '18',
      'content-type': 'text/plain; charset=utf-8',
    },
  }
}

//---------//
// Exports //
//---------//

module.exports = res
