'use strict'

//---------//
// Imports //
//---------//

const utils = require('../../../utils')

//------//
// Main //
//------//

const errIds = {
  get: {
    queryString: {
      ampersandRequired: 'ampersand-required',
      columnRequired: 'column-required',
      operatorRequired: 'operator-required',
      openingQuoteRequired: 'opening-quote-required',
      closingQuoteRequired: 'closing-quote-required',
    },
    invalidRange: 'invalid-range',
    invalidOrder: 'invalid-order',
  },
  delete: {
    queryString: {
      duplicatePkColumnsNotAllowed: 'duplicate-pk-columns-not-allowed',
      equalsRequired: 'equals-required',
      missingPkColumns: 'missing-pk-columns',
      pkColumnRequired: 'pk-column-required',
    },
  },
  post: {
    requestBody: {
      invalidColumns: 'invalid-columns',
      missingRequiredColumns: 'missing-required-columns',
    },
  },
  update: {
    queryString: {
      duplicatePkColumnsNotAllowed: 'duplicate-pk-columns-not-allowed',
      equalsRequired: 'equals-required',
      missingPkColumns: 'missing-pk-columns',
      pkColumnRequired: 'pk-column-required',
    },
    requestBody: {
      mustBeNonEmpty: 'must-be-non-empty',
      invalidColumns: 'invalid-columns',
    },
  },
}

//---------//
// Exports //
//---------//

module.exports = utils.mapErrIdPropToString(errIds)
