'use strict';


//---------//
// Imports //
//---------//

const fp = require('lodash/fp')
  , state = require('./services/state')
  , vanillaReduce = require('lodash/reduce')
  ;


//------//
// Init //
//------//

const capIteratee = getCapIteratee()
  , transformWithKey = capIteratee(3, fp.transform.convert({ cap: false }))
  ;


//------//
// Main //
//------//

//
// Flipped fp fxns.  These could be done via convert, but I prefer the
//   explicit representation.
//
const concat = fp.curry((a, b) => fp.concat(b, a))
  , get = fp.curry((b, a) => fp.get(a, b))
  , gt = fp.curry((a, b) => fp.gt(b, a))
  , includes = fp.curry((b, a) => fp.includes(a, b))
  , set = fp.curry((b, c, a) => fp.set(a, b, c))
  , startsWith = fp.curry((b, a) => fp.startsWith(a, b))
  ;
//
// End of flipped fxns
//

// aliases
const append = concat;
const prepend = fp.concat;
// end aliases

const cliLog = str => { if (state.isCli()) console.log(str); };

const forEachWithKey = capIteratee(2, fp.forEach.convert({ cap: false }));

const hasAll = strArr => fp.allPass(fp.map(str => fp.has(str), strArr));

const hasFileExtension = path => !!path.match(/\/?[^/]*\.[^/]*$/);

const isDefined = fp.negate(fp.isUndefined);

const jstring = toStr => JSON.stringify(toStr, null, 2);

const mapErrIdPropToString = transformWithKey(
  getErrIdsToString([])
  , {}
);

const mapValuesWithKey = capIteratee(2, fp.mapValues.convert({ cap: false }));

const mapWithKey = capIteratee(2, fp.map.convert({ cap: false }));

const mutableAssign = fp.assign.convert({ immutable: false });

const mutableSet = fp.set.convert({ immutable: false });

const reduceFirst = fp.curry(
  (a, b) => vanillaReduce(b, a)
);

const reduceWithKey = capIteratee(3, fp.reduce.convert({ cap: false }));

const reduceWithKeyAndObj = fp.reduce.convert({ cap: false });

const takeWhileWithIndexAndArr = fp.takeWhile.convert({ cap: false });

const tee = val => {
  console.log(jstring(val));
  return val;
};

const teep = fp.curry(
  (first, val) => {
    console.log(first);
    console.log(jstring(val));
    return val;
  }
);

const transformWithKeyAndObj = fp.transform.convert({ cap: false });


//-------------//
// Helper Fxns //
//-------------//

function getErrIdsToString(path) {
  return function errIdsToString(res, val, key) {

    // val should only ever be a string or a plain object
    if (fp.isPlainObject(val)) {
      path.push(key);
      res[key] = transformWithKey(
        getErrIdsToString(path)
        , {}
        , val
      );
      path.pop();
    } else {
      res[key] = fp.reduce((res, val) => res + val + '_', '', path) + val;
    }
  };
}

function getCapIteratee() {
  return fp.curry((cap, fn) =>
    fp.curryN(fn.length, (iteratee, ...args) =>
      fn.apply(null, [fp.ary(cap, iteratee)].concat(args))
    )
  );
}


//---------//
// Exports //
//---------//

module.exports = {
  append: append
  , cliLog: cliLog
  , forEachWithKey: forEachWithKey
  , get: get
  , gt: gt
  , hasAll: hasAll
  , hasFileExtension: hasFileExtension
  , includes: includes
  , isDefined: isDefined
  , jstring: jstring
  , mapErrIdPropToString: mapErrIdPropToString
  , mapValuesWithKey: mapValuesWithKey
  , mapWithKey: mapWithKey
  , mutableAssign: mutableAssign
  , mutableSet: mutableSet
  , prepend: prepend
  , reduceFirst: reduceFirst
  , reduceWithKey: reduceWithKey
  , reduceWithKeyAndObj: reduceWithKeyAndObj
  , set: set
  , startsWith: startsWith
  , takeWhileWithIndexAndArr: takeWhileWithIndexAndArr
  , tee: tee
  , teep: teep
  , transformWithKey: transformWithKey
  , transformWithKeyAndObj: transformWithKeyAndObj
};
