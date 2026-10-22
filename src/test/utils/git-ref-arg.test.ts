import * as assert from 'assert';
import { assertSafeRefArg } from '../../utils/git-ref-arg';

suite('assertSafeRefArg', () => {
  test('returns refs and ranges that git accepts unchanged', () => {
    for (const ref of ['HEAD', 'main', 'feature/diff-scan', 'v1.2.3', '9f9513e', 'main...feature/x', 'HEAD~1']) {
      assert.strictEqual(assertSafeRefArg(ref), ref);
    }
  });

  test('rejects an empty value', () => {
    assert.throws(() => assertSafeRefArg(''), /Invalid git ref/);
  });

  test('rejects a value that would be read as an option', () => {
    assert.throws(() => assertSafeRefArg('--upload-pack=touch /tmp/x'), /Invalid git ref/);
    assert.throws(() => assertSafeRefArg('-h'), /Invalid git ref/);
  });

  test('rejects control characters', () => {
    assert.throws(() => assertSafeRefArg('main\nother'), /Invalid git ref/);
    assert.throws(() => assertSafeRefArg('main\u0000'), /Invalid git ref/);
  });

  test('does not reject shell metacharacters, as the CLI is not run through a shell', () => {
    assert.strictEqual(assertSafeRefArg('release&notes'), 'release&notes');
  });
});
