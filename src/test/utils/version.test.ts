import * as assert from 'assert';
import { isVersionAtLeast } from '../../utils/version';

suite('isVersionAtLeast', () => {
  test('compares major, minor and patch numerically', () => {
    assert.strictEqual(isVersionAtLeast('3.25.0', '3.25.0'), true);
    assert.strictEqual(isVersionAtLeast('3.25.1', '3.25.0'), true);
    assert.strictEqual(isVersionAtLeast('3.26.0', '3.25.9'), true);
    assert.strictEqual(isVersionAtLeast('4.0.0', '3.99.99'), true);
    assert.strictEqual(isVersionAtLeast('3.24.9', '3.25.0'), false);
    assert.strictEqual(isVersionAtLeast('2.99.99', '3.0.0'), false);
  });

  test('compares numbers, not strings', () => {
    assert.strictEqual(isVersionAtLeast('3.100.0', '3.25.0'), true);
    assert.strictEqual(isVersionAtLeast('3.9.0', '3.25.0'), false);
  });

  test('treats missing segments as zero', () => {
    assert.strictEqual(isVersionAtLeast('3.25', '3.25.0'), true);
    assert.strictEqual(isVersionAtLeast('3.25.0', '3.25'), true);
    assert.strictEqual(isVersionAtLeast('3', '3.0.1'), false);
  });

  test('ignores dev and build segments after the patch version', () => {
    assert.strictEqual(isVersionAtLeast('3.25.0.dev7', '3.25.0'), true);
    assert.strictEqual(isVersionAtLeast('3.24.2.dev7', '3.25.0'), false);
    assert.strictEqual(isVersionAtLeast('0.0.1.dev498', '3.25.0'), false);
  });

  test('is false for a missing or malformed version', () => {
    assert.strictEqual(isVersionAtLeast(undefined, '3.25.0'), false);
    assert.strictEqual(isVersionAtLeast(null, '3.25.0'), false);
    assert.strictEqual(isVersionAtLeast('', '3.25.0'), false);
    assert.strictEqual(isVersionAtLeast('latest', '3.25.0'), false);
    assert.strictEqual(isVersionAtLeast('3.x.0', '3.25.0'), false);
  });
});
