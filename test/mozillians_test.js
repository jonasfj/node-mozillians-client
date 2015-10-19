import assert from 'assert'
import Mozillians from '..'
require('source-map-support').install();

suite('Mozillians', () => {

  test('users', async () => {
    let mozillians = new Mozillians(process.env.MOZILLIANS_API_KEY);

    await mozillians.users();
  });

  test('users (by email)', async () => {
    let mozillians = new Mozillians(process.env.MOZILLIANS_API_KEY);

    let result = await mozillians.users({email: 'jopsen@gmail.com'});
    assert(result.results.length === 1, 'Expected exactly Jonas');
    let jonas = result.results[0];
    assert(jonas.is_vouched, 'Jonas ought to be vouched he wrote this!');
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