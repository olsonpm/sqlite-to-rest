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
  }
}

//---------//
// Exports //
//---------//

module.exports = res
