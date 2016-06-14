# Sqlite To Rest

Koa routing middleware allowing you to expose a sqlite database via RESTful CRUD

<!-- START doctoc generated TOC please keep comment here to allow auto update -->
<!-- DON'T EDIT THIS SECTION, INSTEAD RE-RUN doctoc TO UPDATE -->
## Table of Contents
- [Why build it?](#why-build-it)
- [Features](#features)
- [Limitations](#limitations)
- [Tutorial](#tutorial)
- [CLI](#cli)
- [API](#api)
- [RESTful CRUD Operations](#restful-crud-operations)
- [Reference](#reference)
- [Test](#test)

<!-- END doctoc generated TOC please keep comment here to allow auto update -->


## Why build it?

Mostly because I wanted to dig deeper into node web server code, but also
because I haven't jumped onto the NoSQL bandwagon and think that web APIs are
extremely useful.  The result is a modest attempt at automating the CRUD
boilerplate that every developer hates, while following the specs to make API
consumption intuitive.  I chose sqlite to keep the database side of things
simple, with the intent that the API isn't serving heavy loads.


## Features
 - Spec compliant CRUD RESTful API to an existing database's tables and views
 - GET utilizes [JSONStream](https://github.com/dominictarr/JSONStream) so the
   entire response is not held in memory, allowing for arbitrarily large responses.
 - Range requests with the custom range unit 'rows' can be used to GET specific
   rows.  While compliant with rfc7233, the syntax and semantics were kept
   extremely similar to byte-ranges.
 - The server can configure a maximum request range per table since the amount
   of data per row will vary per-table.
 - The server can also configure whether to send the content-range header
   in a HEAD request.  This allows the author to save the server from
   unnecessarily calculating the count on a table that is known to be
   very large.
 - Custom request header 'order' and conditional response header 'accept-order'
   exposes row sorting by column with optional ascending and
   descending specifiers
 - The API enforces correct usage, while sending developer-friendly error
   messages upon 4xx errors.
 - Comes with a friendly CLI to generate the database schema out to a json file
   which is then consumed by the library.  The CLI also allows you to create a
   bare-bones koa server to get you up and running quickly.


## Limitations
 - All tables must use primary keys.  The next limitation explains why.
 - In effort to mitigate damage, unsafe methods only allow modification of
   single rows.  This is enforced by matching the query parameters with the
   'primary key' columns - friendly errors will tell you if called called an
   unsafe method incorrectly.
 - No built-in API key management.  The library as-is can only serve
   trusted consumers.
 - It's sqlite.  This library is not meant for clustering or large workloads.
   See ['Situations Where A Client/Server RDBMS May Work
   Better'](https://www.sqlite.org/whentouse.html) for details.
 - This is my foray into reading rfc's and working with web server libraries
   (koa and middleware in general).  I have tests and feel confident in my
   comprehension of the concepts, but the code is not the prettiest.
 - No friendly data validation currently.  Right now contextless 500 statuses
   are returned if data doesn't pass constraints, and I don't have tests
   ensuring consistent behavior around data validation.


## Tutorial
[This tutorial](https://github.com/olsonpm/sqlite-to-rest/blob/dev/docs/tutorial.md)
will walk you through
1) Creating an initial database
2) Using sqlite-to-rest's CLI to create a bare-bones koa server
3) Walk you through some curl commands to test the server's CRUD RESTful api.


## CLI
By installing this library globally, you receive access to `sqlite-to-rest`.  

The CLI currently contains one command `generate-skeleton` which creates an
initial bare-bones koa server from an existing sqlite database.1  This should
help you get started.

See `sqlite-to-rest --help` for more info.


## API
`require('sqlite-to-rest')` returns an object with three properties.

 - **generateSkeleton**: [madonna-function](https://github.com/olsonpm/madonna-function)
   -> promise(undefined)  
   This will usually be called from the CLI but is also made
   available via the js API.  Its purpose is to generate a barebones koa
   server to get you up and running.  In the directory it will:  
   1) Run `npm init -f` if a package.json doesn't exist  
   2) Output the generated koa server named 'skeleton.js'  
   3) Install and save the dependencies required to run the server

   It takes two properties
   - **dir**: [`isLadenString`](https://github.com/olsonpm/madonna-fp#custom-to-this-library)
     [`isDirectory`](#isdirectory)  
     Directory to generate the koa server.

   - **dbPath** *optional*: [`isSqliteFile`](#issqlitefile)  
     Path to your sqlite3 database.

    ```js
    // example
    sqliteToRest.generateSkeleton({
        dir: beerApiDir
        , dbPath: 'path/to/your/db.sqlite3'
      })
      .then(() => { /* skeleton.js is ready to be ran */ });
    ```

 - **getSqliteRouter**: [madonna-function](https://github.com/olsonpm/madonna-function)
   -> promise([koa-router](https://github.com/alexmingoia/koa-router/tree/master))  
   This function generates the RESTful CRUD routing and returns the modified
   koa-router instance.

   It takes two properties
   - **dbPath**: [`isSqliteFile`](#issqlitefile)  
     Path to your sqlite3 database.

   - **config** *optional*: A [routing config object](#routing-config-object)

   ```js
   // example
   const app = new require('koa')()
    , dbPath = 'path/to/your/db.sqlite3';

   getSqliteRouter({ dbPath })
     .then(router => {
       app.use(router.routes());
       // ...
     })
   ```

## RESTful CRUD Operations
The following is a list of the available crud operations made available by the
RESTful API in the form of pseudo examples.  All assume a beer table with two
columns `id INTEGER PRIMARY KEY` and `name` which is nullable.

As noted in [limitations](#limitations), Be aware that unsafe methods (DELETE
and POST) can only affect one row at a time.

 - GET
   This allows for the most variation.  [Click here](#get-query-operators) for
   all available query operators.  Keep in mind the following examples ignore
   proper [query encoding](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/encodeURIComponent)

   Headers may be specified right below urls

   - **/beer**  
     Requests for all rows

   - **/beer?id=1**  
     Where id = 1

   - **/beer**  
     `range: rows=0-2`  
     First three rows

   - **/beer**  
     `range: rows=-5`  
     Last five rows

   - **/beer**  
     `range: rows=0-`  
     As many rows as the server is able to provide, which in practice will be
     the smaller of [`maxRange`](#tabular-config-object) and total row count.

   - **/beer**  
     `range: rows=1-`  
     As many rows as the server is able to provide, starting from row 1.

   - **/beer**  
     `order: name`  
     Ordered by name ascending

   - **/beer**  
     `order: name desc`  
     Ordered by name descending

   - **/beer**  
     `order: name desc,id`  
     Contrived, but orders first by name descending, and in the case of a tie
     by id ascending.

   - **/beer?id>1**  
     Where id > 1

   - **/beer?id>=2&id<5**  
     Where id >= 2 and id < 5

   - **/beer?name_NOTNULL**  
     Where name is not null

   - **/beer?name_ISNULL**  
     Where name is null

   - **/beer?id!=5&name_LIKE'Spotted%'**  
     Where id != 5 and name is LIKE "Spotted%" (ignore quotes)

   - **/beer?id>=1&id<10&name_LIKE'Avery%'**  
     `order: name desc,id` `range: rows=2-4`  
     Contrived for sake of example.  
     Get beer with ids between 1 and 9 inclusive, with name like "Avery%",
     ordered first by name descending then by id ascending, getting the third
     through 5th rows of the result.  Or in SQL:

     ```sql
     SELECT *
     FROM beer
     WHERE id >= 1
       AND id <10
       AND name LIKE 'Avery%'
     ORDER BY name desc, id
     LIMIT 3 OFFSET 2
     ```

 - DELETE
   Requires a query string with all primary keys set equal to a value.  This
   enforces a maximum deletion of a single row.  

   - **/beer?id=1**  
   Deletes beer with id=1

   *if the beer table instead had a composite primary key of both id and name*
   - **/beer?id=1&name='Avery IPA'**


 - POST create  
   Must not pass a query string.  If a query string is passed, then POST update
   is assumed.  All POST requests must pass the header
   `content-type: application/json`.

   Keep in mind the body must contain all non-nullable and non INTEGER
   PRIMARY KEY columns.  A 400 response will be sent otherwise indicating what
   fields were missed.  Nullable columns will default to null and INTEGER
   PRIMARY KEY columns will automatically increment per
   [sqlite3 specifications](https://www.sqlite.org/autoinc.html).

   Json data will be specified right below urls

   - **/beer**  
   `{"id":1,"name":"Serendipity"}`  
   Creates a beer with id = 1 and name = 'Serendipity'

   - **/beer**  
   `{"id":1}`  
   Creates a beer with id = 1 and name = NULL

   - **/beer**  
   `{"name":"Serendipity"}`  
   Creates a beer with id set to the next incremented value per
   [sqlite3 INTEGER PRIMARY KEY specifications](https://www.sqlite.org/autoinc.html)

   - **/beer**  
   `{}`  
   Creates a beer with id incremented, and name set to NULL

 - POST update  
   Must contain a query string.  Without a query string, POST create is assumed.
   As with POST create, the header `content-type: application/json`
   is mandatory.

   The query string must contain all primary keys to ensure only a single row
   gets updated.  If incorrect values are passed, a 400 will be returned
   listing the offending keys.

   The request body must contain a non-empty object and must contain valid
   keys corresponding to column names.

   Json data will be specified right below urls

   - **/beer?id=1**  
   `{"id":2}`  
   Updates beer with id of 1 setting it to two.

   - **/beer?id=1**  
   `{"name":"Two Women"}`  
   Updates beer with id of 1 setting its name to Two Women.

   *if the beer table instead had a composite primary key of both id and name*
   - **/beer?id=1&name=Two Women**  
   `{"name":"Moon Man"}`  
   Updates beer where id is one and name is Two Women, setting name to Moon Man


## Reference
#### isSqliteFile
 - Just checks the first 16 bytes of the file to see if it equals
   'sqlite format 3' followed by a null byte.

#### isDirectory
 - Returns the result of [fs.statsSync](https://nodejs.org/api/fs.html#fs_fs_statsync_path)
   followed by [<Stats>.isDirectory](https://nodejs.org/api/fs.html#fs_class_fs_stats)

#### isFile
 - Returns the result of [fs.statsSync](https://nodejs.org/api/fs.html#fs_fs_statsync_path)
   followed by [<Stats>.isFile](https://nodejs.org/api/fs.html#fs_class_fs_stats)

### GET query operators
Query conditions must be delimited by ampersands e.g. `id>5&name!=Spotted Cow`

Binary operators (require a value after)  
**=**  
**!=**  
**\>=**  
**<=**  
**\>**  
**<**  
**\_LIKE**  
 - **_LIKE** is special in that it must have opening and closing single
   quotes.  If not, a 400 error will be thrown showing where the parsing was
   unable to complete and what was expected.  See [RESTful CRUD Operations](#restful-crud-operations) for examples.

Unary operators (must follow a column name)  
**_ISNULL**  
**_NOTNULL**  

#### Router config object
[`isLadenPlainObject`](https://github.com/olsonpm/madonna-fp#custom-to-this-library)  
The purpose of this object is to provide generic configuration for the sqlite
router.  The following properties are allowed:

 - **prefix**: [`isLadenString`](https://github.com/olsonpm/madonna-fp#custom-to-this-library)
   The string passed to [`koa-router's`](https://github.com/alexmingoia/koa-router/tree/master)
   [`prefix`](https://github.com/alexmingoia/koa-router/tree/master#new-routeropts)
   constructor option.  For example, the skeleton server doesn't specify
   a prefix, allowing the beer api to be hit directly from the domain root
   `http://localhost:8085/beer`.  If you set prefix to '/api', then you
   would instead send requests to `http://localhost:8085/api/beer`.

 - **allTablesAndViews**: A [tabular configuration object](#tabular-config-object)  
   The configurations specified in this object will apply for all tables and
   views, optionally overridden by the `tablesAndViews` property.

 - **tablesAndViews**: [`isLadenPlainObject`](https://github.com/olsonpm/madonna-fp#custom-to-this-library)
   The object passed **must** have keys matching the database column or view
   names.  If not, a friendly error message will be thrown.  The values for each
   table and view must be a [tabular configuration object](#tabular-config-object)

#### Tabular config object
[`isLadenPlainObject`](https://github.com/olsonpm/madonna-fp#custom-to-this-library)
This object represents configurations that can be set for either views
or tables.  It allows the following properties:

 - **maxRange**: [`isPositiveNumber`](https://github.com/olsonpm/madonna-fp#custom-to-this-library)  
   *Application default*: 1000  
   This is the maximum range your server will allow requests for.  If a GET
   request comes in with no range header, the spec assumes they want the entire
   resource.  If the number of rows resulting in that GET is greater than
   maxRange, then a 416 status is returned with the custom header
   [`max-range`](#custom-headers).  The application default is purposefully
   conservative in hopes that authors will set maxRange according to
   their needs.  
   *Note that 'Infinity' is a valid positive number.*

 - **flags**: [`isLadenArray`](https://github.com/olsonpm/madonna-fp#custom-to-this-library)  
   Currently the only flag accepted is the string 'sendContentRangeInHEAD'.
   When set, HEAD requests will return the available content range in the form
   `content-range: */<max-range>`.  The reason it's configurable is that
   calculating max-range may be more work than its worth, depending on the load
   of the server and the size of your tables.

### Custom Headers

#### Request
 - **order**: This header is only defined for GET, and can be thought of as
   the sql ORDER BY equivalent.  It must contain a comma-delimited column names,
   each optionally followed by a space and the strings 'asc' or 'desc'.  If
   incorrect order values are sent, a 400 response will indicate which ones.


#### Response
These aren't all necessarily custom, but all their usage falls outside what's
defined in the spec and thus need clarification.

 - **GET**
   - **max-range**: This header is returned when the requested number of rows
     surpasses the configured [`maxRange`](#tabular-config-object).  Note the
     request might not specify the range header, but the number of rows
     resulting in that resource will still be checked.

   - **content-range**: [rfc7233](https://tools.ietf.org/html/rfc7233#section-4.2)
     states

     > only the 206 (Partial Content) and 416 (Range Not Satisfiable) status
       codes describe a meaning for Content-Range.

     When sqlite-to-rest responds with a 200 status code, the content-range
     header is sent with the 206 format of `<row start>-<row end>/<row count>`.  

     When a request is sent without a range header and the number of resulting
     rows surpasses [`maxRange`](#tabular-config-object), a 400 is returned
     with content-range set in the 416 format of `*/<row count>`

     Note this header may be returned in a HEAD response.

   - **accept-order**: This will be returned if the request header `order`
     had bad syntax or specified incorrect column names.  For details, refer
     to HEAD -> accept-order below.

 - **HEAD**
   - **accept-order**: `accept-order` is just a comma-delimited list of the
     requested table columns, intended to tell the client the valid columns
     able to be used in the request header `order`.

   - **max-range**: The configured [`maxRange`](#tabular-config-object)
     of the requested table.

   - **content-range**: This header will only be sent if the table has been
     configured with the flag [`sendContentRangeInHEAD`](#tabular-config-object).
     In that case, content-range is set to the 416 format of `*/<row count>`

## Test
`npm test`
