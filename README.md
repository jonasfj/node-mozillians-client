Client Library for Mozillians.org (API v2)
==========================================

Install with `npm mozillians-client --save`, and initialize as follows:
```js
var Mozillians = require('mozillians-client');

var mozillians = new Mozillians('YOUR_API_KEY', {retries: 6});

mozillians.users({email: '...'}).then(function(result) {
  // Do something with result
}, function(err) {
  // Handle err
});
```

The module implements best practice REST API client principals such as:

 * Retries with exponential back-off,
 * Client side request, and
 * HTTPS keep-alive with default HTTPS agent.

For details on these options see the reference below or check out the source.
Also refer to
[API documentation](http://mozillians.readthedocs.org/en/latest/api/apiv2/)
for more details on the options for the methods the the return value of the
methods, all methods returns promises that should be easy to work with.

Reference
---------
Install with `npm mozillians-client --save`, and load as `Mozillians`.
```js
var Mozillians = require('mozillians-client');
```
Then you will have the following methods.

### `new Mozillians(apiKey, options)`
Create new Mozillians client with given `apiKey` and options:

   * `timeout`, client side timeout,
   * `hostname`, alternative hostname in-place of 'mozillians.org',
   * `agent`, an `https.Agent` instance,
   * `retries`, max number of request retries,
   * `delayFactor`, factor by which delays between retries increase,
   * `maxDelay`, maximum delay between retries,
   * `transientErrorCodes`, error codes for which requests are retried

### `Mozillians#users(options)`
Get users, given options:

  * `is_vouched`, boolean - Return only vouched/unvouched users
  * `username`, string - Return user with matching username
  * `full_name`, string - Return user with matching full name
  * `ircname`, string - Return user with matching ircname
  * `email`, string - Return user with matching primary/alternate email
  * `country`, string - Return users with matching country
  * `region`, string - Return users with matching region
  * `city`, string - Return users with matching city
  * `page`, integer - Return results contained in specific page
  * `language`, string - Return users speaking language matching language code
  * `group`, string - Return users who are members of given group name
  * `skill`, string - Return users with skill matching skill name

If a `next` or `previous` page is available the result object will have a
`nextPage()` and `previousPage()` respectfully. Elements the `results` array
will have a `details()` method returning further details if available.

### `Mozillians#groups(options)`
Get groups, given options:

 * `name`, string - Return results matching given name
 * `curator`, integer - Return results matching given mozillians id
 * `functional_area`, true/false - only groups that are functional areas
 * `members_can_leave`, true/false - only groups with a members_can_leave policy
 * `accepting_new_members`, true/false - only groups with an accepting_new_members policy
 * `page`, integer - Return results contained in specific page

If a `next` or `previous` page is available the result object will have a
`nextPage()` and `previousPage()` respectfully. Elements the `results` array
will have a `details()` method returning further details if available.


### `Mozillians#skills(options)`
Get skills, given options:

 * `name`, string - Return results matching given name
 * `page`, integer - Return results contained in specific page

If a `next` or `previous` page is available the result object will have a
`nextPage()` and `previousPage()` respectfully. Elements the `results` array
will have a `details()` method returning further details if available.


License
-------
This module is released under [MPL 2.0](https://www.mozilla.org/en-US/MPL/2.0/).
