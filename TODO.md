### An unordered list of items I may tend to in the future

- 'accept-order' response header should be sent upon an invalid order
  request header
- Rows must be one indexed to handle case of no rows in table
- Test for invalid query cases and ensure friendly errors are returned
- Remove generateInfo since that should just happen upon server startup.
- extract cli (generateSkeleton) to its own module so that installing globally
  doesn't take so long
- Enforce primary keys upon info generation
- Allow for table validation prior to insert
- db_info.json should only hold column names for views
- Look into performance
- Add error ids for each invalid range case and test them
- Implement transactions in testing. Currently state is ensured to be stable
  by copying the database file, then renaming the copy to the original file
  after the unsafe operations are done. The database connection then needs to
  be renewed which is most easily done by restarting the server itself. All
  this overhead is small now but will grow linearly with the number of unsafe
  method tests.
- Test all positive range scenarios as well (including when max range
  isn't specified)
- Write tests for cli and those same commands exposed via js api
- Move shared functionality and validation out into separate middleware.
- Implement PUT and add caution about lack of validation when using
  partial update via POST with a querystring
