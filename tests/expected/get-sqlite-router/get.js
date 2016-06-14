'use strict';


//------//
// Init //
//------//

const {
    averyIPA
    , banjoCat
    , commuterKolsch
    , elliesBrown
    , serendipity
    , thaiStyleWhiteIPA
    , whiteRascal
  } = getCommonBeer()
  ;


//------//
// Main //
//------//

const res = {
  firstFiveRows: getFirstFiveRows()
  , firstFiveRowsByNameAsc: getFirstFiveRowsByNameAsc()
  , firstFiveRowsByNameDesc: getFirstFiveRowsByNameDesc()
  , firstRow: getFirstRow()
  , lastFiveRows: getLastFiveRows()
  , latterFourRows: getLatterFourRows()
  , namedBelgians: getNamedBelgians()
  , nullName: getNullName()
};


//-------------//
// Helper Fxns //
//-------------//

function getFirstFiveRows() {
  return {
    statusCode: 206
    , body: [whiteRascal].concat(
      getLatterFourBodyRows())
    , headers: {
      "content-type": "application/octet-stream",
      "content-range": "rows 0-4/15",
      "content-length": "1305",
      connection: "close"
    }
  };
}

function getFirstFiveRowsByNameAsc() {
  return {
    statusCode: 206
    , body: getFirstFiveBodyRowsByNameAsc()
    , headers: {
      "content-type": "application/octet-stream",
      "content-range": "rows 0-4/14",
      "content-length": "1412",
      connection: "close"
    }
  };
}

function getFirstFiveRowsByNameDesc() {
  return {
    statusCode: 206
    , body: getFirstFiveBodyRowsByNameDesc()
    , headers: {
      "content-type": "application/octet-stream",
      "content-range": "rows 0-4/14",
      "content-length": "1312",
      connection: "close"
    }
  };
}

function getLastFiveRows() {
  return {
    statusCode: 206
    , body: getLastFiveBodyRows()
    , headers: {
      "content-type": "application/octet-stream",
      "content-range": "rows 11-15/15",
      "content-length": "1352",
      connection: "close"
    }
  };
}

function getLatterFourRows() {
  return {
    statusCode: 200
    , body: getLatterFourBodyRows()
    , headers: {
      "content-type": "application/octet-stream",
      "content-range": "rows 0-3/3",
      "content-length": "1073",
      connection: "close"
    }
  };
}

function getFirstRow() {
  return {
    statusCode: 200
    , body: [whiteRascal]
    , headers: {
      "content-type": "application/octet-stream",
      "content-range": "rows 0-0/0",
      "content-length": "234",
      connection: "close"
    }
  };
}

function getNullName() {
  return {
    statusCode: 200
    , body: [getBodyNullName()]
    , headers: {
      "content-type": "application/octet-stream",
      "content-range": "rows 0-0/0",
      "content-length": "65",
      connection: "close"
    }
  };
}

function getFirstFiveBodyRowsByNameAsc() {
  return [
    averyIPA
    , banjoCat
    , {
      id: 7
      , brewery_id: 2
      , description: 'Blood oranges and Mandarina Bavaria hops seamlessly complement one another in this saison providing aromatic notes of citrus and bright, juicy flavors. The addition of pink peppercorns amplifies the spicy notes imparted by the saison yeast while balancing the beer’s natural sweetness and dry finish.'
      , name: 'Blood Orange Saison'
    }
    , commuterKolsch
    , elliesBrown
  ];
}

function getFirstFiveBodyRowsByNameDesc() {
  return [
    whiteRascal
    , {
      id: 11
      , brewery_id: 3
      , description: 'The collaboration of two Craft companies both led by women, New Glarus Brewing and Weyermann Malting, is unique. You hold the result “Two Women” a Classic Country Lager.'
      , name: 'Two Women'
    }
    , thaiStyleWhiteIPA
    , {
      id: 9
      , brewery_id: 3
      , description: "Expect this ale to be fun, fruity and satisfying. You know you're in Wisconsin when you see the Spotted Cow."
      , name: 'Spotted Cow'
    }
    , serendipity
  ];
}

function getBodyNullName() {
  return {
    id: 16
    , brewery_id: 5
    , description: "Belgian"
    , name: null
  };
}

function getNamedBelgians() {
  return {
    statusCode: 200
    , body: [
      whiteRascal
      , thaiStyleWhiteIPA
    ]
    , headers: {
      "content-type": "application/octet-stream",
      "content-range": "rows 0-1/1",
      "content-length": "726",
      connection: "close"
    }
  };
}

function getLatterFourBodyRows() {
  return [
    averyIPA
    , elliesBrown
    , {
      id: 4
      , brewery_id: 1
      , description: "A contemporary rendition of a classic style, Joe's is hopped with purpose: beautifully bitter and dry with an abundance of floral, Noble German hops."
      , name: "Joe's Pils"
    }
    , thaiStyleWhiteIPA
  ];
}

function getLastFiveBodyRows() {
  return [
    serendipity
    , {
      id: 13
      , brewery_id: 4
      , description: "A good example of the American twist on the English classic. It is more of a deep copper than pale gold, as is common for the style, and has a unique malt profile due in large part to the addition of 20% American Wheat Malt. A strong American hop structure provides an enticing aroma of tangerine and grapefruit and smooth finish that will keep you coming back for more."
      , name: "Penguin Pale Ale"
    }
    , banjoCat
    , commuterKolsch
    , getBodyNullName()
  ];
}

function getCommonBeer() {
  return {
    averyIPA: {
      id: 2
      , brewery_id: 1
      , description: "Avery IPA features a citrusy, floral bouquet and a rich, malty finish."
      , name: "Avery IPA"
    }
    , banjoCat: {
      id: 14
      , brewery_id: 4
      , description: "This beer is black in color but very smooth and does not have a bitter malt flavor found in many stouts and porters. It is aggressively hopped, including a dry hop addition that gives Banjo Cat a strong citrus aroma and vibrant flavor resulting in a well-balanced black ale."
      , name: "Banjo Cat"
    }
    , elliesBrown: {
      id: 3
      , brewery_id: 1
      , description: "Chocolate malt gives this beer a brown sugar maltiness with hints of vanilla and nuts, while subtle hopping gives it an overall drinkability that’s second to none."
      , name: "Ellie's Brown Ale"
    }
    , serendipity: {
      id: 12
      , brewery_id: 3
      , description: "You hold the happy accident of Wisconsin’s favorite fruit aged in oak with an almost magical wild fermentation."
      , name: "Serendipity"
    }
    , thaiStyleWhiteIPA: {
      id: 5
      , brewery_id: 2
      , description: "Drawing inspiration from all over the globe, our Thai Style White IPA is an artful combination of uncommon, yet carefully chosen ingredients. Brewed using Belgian Wit yeast, hopped like an American IPA and infused with seven Asian-inspired spices, this beer is far from traditional. The sharp, juicy citrus notes of the hops interplay with the unique Thai spice blend to create an unexpected, one of a kind refreshment."
      , name: "Thai Style White IPA"
    }
    , whiteRascal: {
      id: 1
      , brewery_id: 1
      , description: "An authentic Belgian style white ale, this Rascal is unfiltered and cleverly spiced with coriander and Curaçao orange peel producing a refreshingly zesty classic ale."
      , name: "White Rascal"
    }
    , commuterKolsch: {
      id: 15
      , brewery_id: 4
      , description: "This is very true to the style that originated in Koln (Cologne), Germany. Our Kolsch is unfiltered and cold-conditioned. The result is a beer that is clean and refreshing, with a crisp finish. It is agreeable without being boring; the beer lover’s session ale."
      , name: "Commuter Kolsch"
    }
  };
}


//---------//
// Exports //
//---------//

module.exports = res;
