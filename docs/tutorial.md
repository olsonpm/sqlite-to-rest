# Use sqlite-to-rest

This tutorial will initially walk you through creating a simple sqlite database
to avoid gotchas particular to your existing database. [Feel free to skip
those steps](#end-of-database-steps)

1. Before you do anything you need a sqlite database to consume. If you
   don't already have sqlite3 installed (test via `which sqlite3`), then either
   [download a precompiled binary](https://www.sqlite.org/download.html) with the
   cli tools built-in, or more preferably use your package manager to install
   it for you.

2. Now that you have the sqlite3 command line tool available, you can create
   your very own beer database.

   ```sh
   $ cd <into your new project directory>
   $ sqlite3 beer.sqlite3
   ```

3. Create your brewery and beer tables.

   _Just a friendly reminder to [enable foreign key support](https://www.sqlite.org/foreignkeys.html#fk_enable)
   if that sort of thing matters to you_

   ```sql
   CREATE TABLE brewery(
     id integer primary key
     , state
     , city_name
     , name
   );

   CREATE TABLE beer(
     id integer primary key
     , brewery_id references brewery (id)
     , description
     , name
   );
   ```

4. And insert some data

   ```sql
   -- breweries
   INSERT INTO "brewery" (state, city_name, name)
   VALUES ('CO','Boulder','Avery')
   , ('WI','New Glarus','New Glarus');

   -- beers
   INSERT INTO "beer" (brewery_id, description, name)
   VALUES(1,'An authentic Belgian style white ale, this Rascal is unfiltered and cleverly spiced with coriander and Curaçao orange peel producing a refreshingly zesty classic ale.','White Rascal')
   , (1,'Avery IPA features a citrusy, floral bouquet and a rich, malty finish.','Avery IPA')
   , (1,'Chocolate malt gives this beer a brown sugar maltiness with hints of vanilla and nuts, while subtle hopping gives it an overall drinkability that’s second to none.','Ellie''s Brown Ale')
   , (2,'Expect this ale to be fun, fruity and satisfying. You know you''re in Wisconsin when you see the Spotted Cow.','Spotted Cow')
   , (2,'A session beer with a bright bold blend of five hops that flirt obligingly with the smooth malty backside.','Moon Man')
   , (2,'The collaboration of two Craft companies both led by women, New Glarus Brewing and Weyermann Malting, is unique. You hold the result “Two Women” a Classic Country Lager.','Two Women');
   ```

5. Phew, all that copy pasta. Go ahead and exit.
   ```sh
   sqlite> .exit
   ```

##### End of database steps

1. Time to install sqlite-to-rest globally via npm to gain its cli

   ```sh
   $ npm install --global olsonpm/sqlite-to-rest#dev
   ```

   _The cli is very friendly and easy to explore via `sqlite-to-rest --help`_

2. And generate a bare-bones koa server to test against.

   ```sh
   $ sqlite-to-rest generate-skeleton --db-path ./beer.sqlite3
   package.json not found in working directory.  Running `npm init -f`.
   Writing the skeleton server to: /home/phil/garbage/skeleton.js
   Installing dependencies
   Finished!
   ```

3. Finally run the server

   ```sh
   $ node skeleton.js
   Listening on port: 8085
   ```

4. And consume!

   _I have [jq](https://stedolan.github.io/jq/) installed for formatting, though
   the unformatted output isn't terrible_

   ```sh
   # get all breweries
   $ curl -s http://localhost:8085/brewery | jq
   # outputs
   [
     {
       "id": 1,
       "state": "CO",
       "city_name": "Boulder",
       "name": "Avery"
     },
     {
       "id": 2,
       "state": "WI",
       "city_name": "New Glarus",
       "name": "New Glarus"
     }
   ]

   # get the first three beers
   $ curl -s -H 'range: rows=0-2' http://localhost:8085/beer | jq
   # outputs
   [
     {
       "id": 1,
       "brewery_id": 1,
       "description": "An authentic Belgian style white ale, this Rascal is unfiltered and cleverly spiced with coriander and Curaçao orange peel producing a refreshingly zesty classic ale.",
       "name": "White Rascal"
     },
     {
       "id": 2,
       "brewery_id": 1,
       "description": "Avery IPA features a citrusy, floral bouquet and a rich, malty finish.",
       "name": "Avery IPA"
     },
     {
       "id": 3,
       "brewery_id": 1,
       "description": "Chocolate malt gives this beer a brown sugar maltiness with hints of vanilla and nuts, while subtle hopping gives it an overall drinkability that’s second to none.",
       "name": "Ellie's Brown Ale"
     }
   ]

   # create another brewery
   $ curl -s -H "Content-Type: application/json" \
     -d '{"state":"WI", "city_name":"Madison", "name": "One Barrel"}' \
     http://localhost:8085/brewery | jq
   # outputs
   {
     "id": 3,
     "state": "WI",
     "city_name": "Madison",
     "name": "One Barrel"
   }

   # delete that brewery
   $ curl -X DELETE http://localhost:8085/brewery?id=3

   # update an existing brewery
   $ curl -s -H "Content-Type: application/json" \
     -d '{"name": "New Glarus Brewing"}' \
     http://localhost:8085/brewery?id=2 | jq
   # outputs
   {
     "id": 2,
     "state": "WI",
     "city_name": "New Glarus",
     "name": "New Glarus Brewing"
   }
   ```

You're done son!
