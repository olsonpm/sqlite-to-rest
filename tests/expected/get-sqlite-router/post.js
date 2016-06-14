'use strict';

//------//
// Main //
//------//

const res = {
  eauClaireSuccess: getEauClaireSuccess()
};


//-------------//
// Helper Fxns //
//-------------//

function getEauClaireSuccess() {
  return {
    statusCode: 201,
    body: {
      state: "WI",
      city_name: "Eau Claire"
    },
    headers: {
      "content-type": "application/json; charset=utf-8",
      location: "/city?state=WI&city_name=Eau Claire",
      "content-length": "39",
      connection: "close"
    }
  };
}


//---------//
// Exports //
//---------//

module.exports = res;
