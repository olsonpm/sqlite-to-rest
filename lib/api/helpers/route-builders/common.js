'use strict';


//---------//
// Imports //
//---------//

const bPromise = require('bluebird')
  , fp = require('lodash/fp')
  , utils = require('../../../utils')
  ;


//------//
// Init //
//------//

const isDefined = utils.isDefined
  , removeLeading = getRemoveLeading()
  , startsWith = utils.startsWith
  ;


//------//
// Main //
//------//

const appendMidParsed = str => '\nquery string (mid-parsed): ' + str;

const bRunQuery = (conn, query, params) => {
  return new bPromise((resolve, reject) => {
    try {
      conn.run(query, params, function(err) {
        if (err) reject(err);
        else resolve(this);
      });
    } catch (err) {
      reject(err);
    }
  });
};

const attachError = (ctx, err) => {
  ctx.status = 400;
  ctx.body = {
    msg: err.msg
    , id: err.id
  };
};

const doesNotHaveFlag = flag => fp.negate(hasFlag(flag));

const getParams = fp.flow(
  fp.values
  , fp.flatten
  , fp.filter(fp.has('val'))
  , fp.map('val')
);

const getPkColumnNames = fp.flow(
  fp.pickBy(isPrimaryKey)
  , fp.map('name')
);

const getQuery = ({ parsed, queryStart, limit, offset, order }) => {
  const parsedPairs = fp.flow(
    fp.toPairs
    , fp.reduce(flattenParsed, [])
  )(parsed);

  let res = queryStart;
  if (fp.size(parsed)) {
    res += ' WHERE ' + fp.reduce(
      genWhereClause
      , pairToCondition(parsedPairs[0])
      , parsedPairs.slice(1)
    );
  }
  if (isDefined(order)) res += ' ORDER BY ' + order;
  if (isDefined(limit)) res += ' LIMIT ' + limit;
  if (offset) res += ' OFFSET ' + offset;

  return res;
};

const hasFlag = flagVal => fp.flow(
  fp.get('flags')
  , fp.includes(flagVal)
);

const isAdjacentToSingleQuote = (i, str) => {
  const quoteBefore = i !== 0 && str[i - 1] === "'"
    , quoteAfter = i < str.length - 1 && str[i + 1] === "'";

  return quoteBefore || quoteAfter;
};

function parseQueryForPkColumns(str, pkColumnNames, qsErrIds) {
  const res = {}
    , originalQueryStr = str
    , parseErr = 'Error while parsing query string: ';

  let col
    , val;

  const pkColumnCounts = fp.reduce(
    (res, val) => fp.set(val, 0, res)
    , {}
    , pkColumnNames
  );

  while (str.length) {
    // loop goes through three steps.  Extract column -> operator -> and value
    //   if applicable

    col = fp.find(startsWith(str), pkColumnNames);
    if (!col) {
      const midParsed = (str === originalQueryStr)
        ? ''
        : '(mid-parsed)';

      return {
        msg: parseErr + 'PK Column name required.\n'
          + 'query string ' + midParsed + ': ' + str
          + '\navailable columns: ' + pkColumnNames.join(', ')
        , hasErr: fp.constant(true)
        , id: qsErrIds.pkColumnRequired
      };
    } else if (pkColumnCounts[col] === 1) {
      return {
        msg: parseErr + "Duplicate pk columns not allowed.\n"
          + "duplicate column: " + col
          + appendMidParsed(str)
          + "\noriginal query: " + originalQueryStr
        , hasErr: fp.constant(true)
        , id: qsErrIds.duplicatePkColumnsNotAllowed
      };
    }

    pkColumnCounts[col] += 1;

    str = removeLeading(str, col);
    if (!startsWith(str, '=')) {
      return {
        msg: parseErr + "Operator '=' required." + appendMidParsed(str)
        , hasErr: fp.constant(true)
        , id: qsErrIds.equalsRequired
      };
    }

    str = str.slice(1);
    val = fp.takeWhile(
      fp.negate(
        fp.eq('&')
      )
      , str
    ).join('');

    str = removeLeading(str, val);

    if (str.length) str = str.slice(1);

    // so far so good - append operator + value to result column
    res[col] = (res[col] || []).concat({
      op: '='
      , val: val
    });
  }

  const pkColumnsMissing = fp.flow(
    fp.pickBy(fp.eq(0))
    , fp.keys
  )(pkColumnCounts);

  if (fp.size(pkColumnsMissing)) {
    return {
      msg: parseErr + "All pk columns must be passed.\n"
        + "query: " + originalQueryStr
        + "\nmissing pk columns: " + pkColumnsMissing.join(', ')
      , hasErr: fp.constant(true)
      , id: qsErrIds.missingPkColumns
    };
  }

  return res;
}

const quoteNotAdjacentToAnother = (char, i, str) => {
  return char !== "'" || isAdjacentToSingleQuote(i, str);
};

// assumes valid input
function getRemoveLeading() {
  return (str, startsWith) => str.slice(startsWith.length);
}


//-------------//
// Helper Fxns //
//-------------//

function pairToCondition(aPair) {
  // _ISNULL and _NOTNULL don't have corresponding values
  const valPlaceholder = (fp.has('val', aPair[1]))
    ? ' ?'
    : '';

  return aPair[0] + ' ' + aPair[1].op + valPlaceholder;
}
function genWhereClause(res, aPair) {
  return res + ' AND ' + pairToCondition(aPair);
}
function flattenParsed(res, aPair) {
  return res.concat(
    fp.map(
      parsedVal => [aPair[0], parsedVal]
      , aPair[1]
    )
  );
}
function isPrimaryKey(aColumn) {
  return fp.flow(
    fp.get('flags')
    , fp.contains('isPrimaryKey')
  )(aColumn);
}

function getInvalidOrderElements(order, columnNames) {
  const orderRegex = new RegExp('^(?:' + columnNames.join('|') + ')(?: (?:asc|desc))?$');
  return fp.flow(
    fp.invokeArgs('split', [','])
    , fp.reject(fp.invokeArgs('match', [orderRegex]))
  )(order);
}


//---------//
// Exports //
//---------//

module.exports = {
  appendMidParsed: appendMidParsed
  , bRunQuery: bRunQuery
  , attachError: attachError
  , doesNotHaveFlag: doesNotHaveFlag
  , getInvalidOrderElements: getInvalidOrderElements
  , getParams: getParams
  , getPkColumnNames: getPkColumnNames
  , getQuery: getQuery
  , hasFlag: hasFlag
  , parseQueryForPkColumns: parseQueryForPkColumns
  , quoteNotAdjacentToAnother: quoteNotAdjacentToAnother
  , removeLeading: removeLeading
};
