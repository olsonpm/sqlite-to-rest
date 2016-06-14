'use strict';

//------//
// Main //
//------//

const res = {
  thaiSuccess: getThaiSuccess()
};


//-------------//
// Helper Fxns //
//-------------//

function getThaiSuccess() {
  return {
    statusCode: 201,
    "body": {
      brewery_id: 2,
      description: "The old description was just too long",
      id: 5,
      name: "Thai Style White IPA"
    },
    headers: {
      "content-length": "107",
      "content-location": "/beer?id=5",
      "content-type": "application/json; charset=utf-8",
      connection: "close"
    }
  };
}


//---------//
// Exports //
//---------//

module.exports = res;
