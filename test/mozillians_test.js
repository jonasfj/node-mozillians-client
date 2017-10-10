import assert from 'assert'
import Mozillians from '..'
require('source-map-support').install();

suite('Mozillians', () => {

  let jonas;
  beforeEach(function() {
    if (!process.env.MOZILLIANS_API_KEY) {
      console.log('set MOZILLIANS_API_KEY to run tests');
      this.skip();
    }
  });

  test('users', async () => {
    let mozillians = new Mozillians(process.env.MOZILLIANS_API_KEY);

    await mozillians.users();
  });

  test('users (by email)', async () => {
    let mozillians = new Mozillians(process.env.MOZILLIANS_API_KEY);

    let result = await mozillians.users({email: 'jopsen@gmail.com'});
    assert(result.results.length === 1, 'Expected exactly Jonas');
    jonas = result.results[0];
    assert(jonas.is_vouched, 'Jonas ought to be vouched he wrote this!');
  });

  test('users.details', async () => {
    let mozillians = new Mozillians(process.env.MOZILLIANS_API_KEY);

    // uses `jonas` from previous test
    let details = await jonas.details();
    assert(details.full_name.value === 'Jonas Finnemann Jensen', 'full_name is set');
  });

  test('groups', async () => {
    let mozillians = new Mozillians(process.env.MOZILLIANS_API_KEY);

    await mozillians.groups();
  });

  test('skills', async () => {
    let mozillians = new Mozillians(process.env.MOZILLIANS_API_KEY);

    await mozillians.skills();
  });
});
