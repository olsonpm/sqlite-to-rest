'use strict'

//------//
// Main //
//------//

const res = {
  beer: getBeer(),
  brewery: getBrewery(),
}

//-------------//
// Helper Fxns //
//-------------//

function getBeer() {
  return {
    statusCode: 200,
    headers: {
      'accept-order': 'id,brewery_id,description,name',
      'accept-ranges': 'rows',
      connection: 'close',
      'content-range': 'rows */16',
      'max-range': '5',
    },
  }
}
function getBrewery() {
  return {
    statusCode: 200,
    headers: {
      'accept-order': 'id,state,city_name,name',
      'accept-ranges': 'rows',
      connection: 'close',
      'content-range': 'rows */5',
      'max-range': '1000',
    },
  }
}

//---------//
// Exports //
//---------//

module.exports = res
