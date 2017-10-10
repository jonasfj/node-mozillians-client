import https from 'https'
import assert from 'assert'
import qs from 'querystring'
import url from 'url'
import _ from 'lodash'
import crypto from 'crypto'

/** Transient error.codes that cause a retry */
const TRANSIENT_HTTP_ERROR_CODES = [
  'ETIMEDOUT',
  'ECONNRESET',
  'EADDRINUSE',
  'ESOCKETTIMEDOUT',
  'ECONNREFUSED',
  500,
  502,
  503,
  504,
];

/**
 * Validate the types for options given
 *
 *  - types, mapping from option key to type: 'string', 'boolean', 'number'
 *  - options, options to validate
 */
let validateOptions = (types, options) => {
  _.forEach(options, (value, key) => {
    if (!types[key]) {
      throw new Error('Unknown option:  "' + key + '"');
    }
    if (typeof(value) !== types[key]) {
      throw new Error('Option:  "' + key + '" must have type: ' + types[key]);
    }
  });
};

/**
 * Cheap request and superagent alternative that does the bare minimum, plus
 * handling error codes correctly.
 *
 *  - options, must be https.request() compliant options
 *  - timeout, client side request timeout
 */
let request = (options, timeout) => {
  return new Promise((resolve, reject) => {
    // Make a request
    let req = https.request(options);

    // Set request timeout
    req.setTimeout(timeout, () => req.abort());

    // Handle request errors
    req.once('error', reject);

    // Handle response
    req.once('response', res => {
      // Set response encoding
      res.setEncoding('utf8');

      // Buffer up chunks
      let chunks = [];
      res.on('data', function(chunk) {
        chunks.push(chunk);
      });

      // Reject on error
      res.once('error', reject);

      // Resolve on request end
      res.once('end', function() {
        let payload = chunks.join('');

        // Handle failed authentication
        if (res.statusCode === 403) {
          let err = new Error("Authentication failed: " + detail);
          err.detail = payload;
          err.code = res.statusCode;
          return reject(err);
        }

        // Handle non-200 responses
        if (res.statusCode !== 200) {
          let err = new Error("Unexpected statusCode: " + res.statusCode +
                              " - " + detail);
          err.detail = payload;
          err.code = res.statusCode;
          return reject(err);
        }

        // Add payload property to response object
        try {
          payload = JSON.parse(payload);
        } catch (err) {
          let err = new Error("Failed to parse JSON payload: " + payload);
          err.detail = payload;
          err.code = 'INVALID_JSON';
          return eject(err);
        }

        // return payload
        resolve(payload);
      });
    });

    // Declare that we're not sending any payload
    req.end();
  });
};

/**
 * Simple function to retry f until success.
 *
 * options includes:
 *   - retries, max number of retries,
 *   - transientErrorCodes, error codes to retry for,
 *   - delayFactor, factor to increase delay by,
 *   - maxDelay, maximum delay allowed
 */
let retry = async (f, options) => {
  let retry = 0;
  while (true) {
    try {
      return f();
    } catch (err) {
      // Add number of retries to the error object
      err.retries = retry;

      // Don't retry if this is a non-transient error
      if (options.transientErrorCodes.indexOf(err.code) === -1) {
        throw err;
      }

      // Don't retry if retries have been exhausted
      if (retry >= options.retries) {
        throw err;
      }
      retry += 1;
      // Compute delay
      let delay = Math.min(
        Math.pow(2, retry) * options.delayFactor,
        options.maxDelay
      );

      // Sleep for the delay and try again
      await new Promise(accept => setTimeout(accept, delay));
    }
  };
};

/** Mozillians API client */
export default class Mozillians {
  /**
   * Create new Mozillians API client
   *
   * With options as follows:
   *   - timeout, client side timeout,
   *   - hostname, alternative hostname in-place of 'mozillians.org',
   *   - agent, https.Agent instance,
   *   - retries, max number of request retries,
   *   - delayFactor, factor by which delays between retries increase,
   *   - maxDelay, maximum delay between retries,
   *   - transientErrorCodes, error codes for which requests are retried
   */
  constructor(apiKey, options = {}) {
    assert(typeof(apiKey) === 'string', "Expected an API key!");
    assert(typeof(options) === 'object', "Expected options to be an object");
    this._options = _.defaults({}, options, {
      timeout: 15 * 1000,
      hostname: 'mozillians.org',
      agent: https.globalAgent,
      retries: 5,
      delayFactor: 100,
      maxDelay: 30 * 1000,
      transientErrorCodes: TRANSIENT_HTTP_ERROR_CODES
    });
    this._apiKey = apiKey;
  }

  _getFromUrlReference(reference) {
    let options = url.parse(reference, true);
    let cheatCache = '&cheat-cache=' + crypto.randomBytes(18).toString('hex');
    delete options.query.api_key;
    return retry(() => request({
      method: 'GET',
      hostname: options.hostname,
      path: options.pathname + '?' + qs.stringify(options.query) + cheatCache,
      headers: {
        'X-API-KEY': this._apiKey
      },
      agent: this._options.agent
    }, this._options.timeout), this._options);
  }

  async _getFromOptions(path, options) {
    // Get the result
    let cheatCache = '&cheat-cache=' + crypto.randomBytes(18).toString('hex');
    let result = await retry(() => request({
      method: 'GET',
      hostname: this._options.hostname,
      path: path + '?' + qs.stringify(options) + cheatCache,
      headers: {
        'X-API-KEY': this._apiKey
      },
      agent: this._options.agent
    }, this._options.timeout), this._options);

    // Add a details method to all objects
    if (result.results) {
      result.results.forEach(obj => {
        if (obj._url) {
          obj.details = () => this._getFromUrlReference(obj._url);
        }
      });
    }

    // Methods to get next and previous page
    if (result.next) {
      result.nextPage = () => this._getFromUrlReference(result.next);
    }
    if (result.previous) {
      result.previousPage = () => this._getFromUrlReference(result.previous);
    }

    // Return the result
    return result;
  }

  /**
   * Get users, given options:
   *  - is_vouched, boolean - Return only vouched/unvouched users
   *  - username, string - Return user with matching username
   *  - full_name, string - Return user with matching full name
   *  - ircname, string - Return user with matching ircname
   *  - email, string - Return user with matching primary/alternate email
   *  - country, string - Return users with matching country
   *  - region, string - Return users with matching region
   *  - city, string - Return users with matching city
   *  - page, integer - Return results contained in specific page
   *  - language, string - Return users speaking language matching language code
   *  - group, string - Return users who are members of given group name
   *  - skill, string - Return users with skill matching skill name
   *
   * If next or previous page is available result will have a nextPage() and
   * previousPage() respectfully. Elements the "results" array will have a
   * details() method returning further details.
   */
  users(options) {
    validateOptions({
      is_vouched: 'boolean',
      username:   'string',
      full_name:  'string',
      ircname:    'string',
      email:      'string',
      country:    'string',
      region:     'string',
      city:       'string',
      page:       'number',
      language:   'string',
      group:      'string',
      skill:      'string'
    }, options);
    return this._getFromOptions('/api/v2/users/', options);
  }

  /**
   * Get groups, given options:
   *  - name, string - Return results matching given name
   *  - curator, integer - Return results matching given mozillians id
   *  - functional_area, true/false - only groups that are functional areas
   *  - members_can_leave, true/false - groups with members_can_leave policy
   *  - accepting_new_members, true/false - only groups with
   *    accepting_new_members policy
   *  - page, integer - Return results contained in specific page
   *
   * If next or previous page is available result will have a nextPage() and
   * previousPage() respectfully. Elements the "results" array will have a
   * details() method returning further details.
   */
  groups(options) {
    validateOptions({
      name: 'string',
      curator: 'number',
      functional_area: 'boolean',
      members_can_leave: 'boolean',
      accepting_new_members: 'boolean',
      page: 'number'
    });
    return this._getFromOptions('/api/v2/groups/', options);
  }

  /**
   * Get skills, given options:
   *  - name, string - Return results matching given name
   *  - page, integer - Return results contained in specific page
   *
   * If next or previous page is available result will have a nextPage() and
   * previousPage() respectfully. Elements the "results" array will have a
   * details() method returning further details.
   */
  skills(options) {
    validateOptions({
      name: 'string',
      page: 'number'
    });
    return this._getFromOptions('/api/v2/groups/', options);
  }
};

