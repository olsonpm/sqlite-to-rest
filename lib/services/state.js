'use strict';


//---------//
// Imports //
//---------//

const fp = require('lodash/fp')
  ;


//------//
// Init //
//------//

// can't grab from utils because that would be a circular reference
const mutableSet = fp.set.convert({ immutable: false })
  , setState = getSetState()
  , state = {}
  ;


//------//
// Main //
//------//

const res = buildRes([
  'isCli'
]);


//-------------//
// Helper Fxns //
//-------------//

function getSetState() {
  return fp.curry(
    (path, state, val) => mutableSet(path, val, state)
  );
}

function buildRes(props) {
  return fp.reduce(
    (res, cur) => fp.flow(
      mutableSet('set' + fp.upperFirst(cur), setState(cur, state))
      , mutableSet(cur, () => state[cur])
    )(res)
    , {}
    , props
  );
}


//---------//
// Exports //
//---------//

module.exports = res;
