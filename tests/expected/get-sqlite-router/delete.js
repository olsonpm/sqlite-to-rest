'use strict'

//------//
// Main //
//------//

const res = {
  success: getSuccess(),
}

//-------------//
// Helper Fxns //
//-------------//

function getSuccess() {
  return {
    statusCode: 204,
    headers: {
      connection: 'close',
    },
  }
}

//---------//
// Exports //
//---------//

module.exports = res
