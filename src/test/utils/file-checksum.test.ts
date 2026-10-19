import * as assert from 'assert';
import * as crypto from 'crypto';
import * as fs from 'fs';
import * as path from 'path';
import {
  parseOnedirChecksumDb,
  verifyDirContentChecksums,
  verifyDirContentExactly,
} from '../../utils/file-checksum';
import { createTempDir, registerLoggerMock } from '../helpers';

const sha256 = (content: string): string => crypto.createHash('sha256').update(content)
  .digest('hex');

const CLI_FILES: Record<string, string> = {
  'cycode-cli/cycode-cli': 'executable',
  'cycode-cli/_internal/Python': 'python',
  'cycode-cli/_internal/lib dir/module.so': 'module',
};

suite('file-checksum', () => {
  let rootPath: string;
  let cliDirPath: string;
  let checksums: Record<string, string>;

  suiteSetup(() => {
    registerLoggerMock();
  });

  setup(() => {
    rootPath = createTempDir();
    cliDirPath = path.join(rootPath, 'cycode-cli');

    checksums = {};
    for (const [file, content] of Object.entries(CLI_FILES)) {
      fs.mkdirSync(path.dirname(path.join(rootPath, file)), { recursive: true });
      fs.writeFileSync(path.join(rootPath, file), content);
      checksums[file] = sha256(content);
    }
  });

  teardown(() => {
    fs.rmSync(rootPath, { recursive: true, force: true });
  });

  test('parses the checksum db', () => {
    const db = Object.entries(checksums).map(([file, hash]) => `${hash} ${file}`)
      .join('\n');
    // file names with spaces are not supported by the db format. only the first word is used
    const parsed = parseOnedirChecksumDb(`${db}\n\n`);
    assert.strictEqual(parsed['cycode-cli/cycode-cli'], checksums['cycode-cli/cycode-cli']);
    assert.strictEqual(parsed['cycode-cli/_internal/Python'], checksums['cycode-cli/_internal/Python']);
  });

  suite('verifyDirContentExactly', () => {
    test('accepts a directory which matches the checksum db', () => {
      assert.strictEqual(verifyDirContentExactly(rootPath, cliDirPath, checksums), true);
    });

    test('rejects an empty checksum db', () => {
      assert.strictEqual(verifyDirContentExactly(rootPath, cliDirPath, {}), false);
    });

    test('rejects extra files which are not listed in the checksum db', () => {
      fs.writeFileSync(path.join(cliDirPath, '_internal', 'injected.dylib'), 'malicious');
      assert.strictEqual(verifyDirContentExactly(rootPath, cliDirPath, checksums), false);
    });

    test('rejects symlinks', () => {
      fs.symlinkSync(path.join(cliDirPath, 'cycode-cli'), path.join(cliDirPath, '_internal', 'link'));
      assert.strictEqual(verifyDirContentExactly(rootPath, cliDirPath, checksums), false);
    });

    test('rejects symlinks which replace listed files', () => {
      const outsideFile = path.join(rootPath, 'outside');
      fs.writeFileSync(outsideFile, 'executable');
      fs.rmSync(path.join(cliDirPath, 'cycode-cli'));
      fs.symlinkSync(outsideFile, path.join(cliDirPath, 'cycode-cli'));
      assert.strictEqual(verifyDirContentExactly(rootPath, cliDirPath, checksums), false);
    });

    test('rejects missing files', () => {
      fs.rmSync(path.join(cliDirPath, '_internal', 'Python'));
      assert.strictEqual(verifyDirContentExactly(rootPath, cliDirPath, checksums), false);
    });

    test('rejects modified files', () => {
      fs.appendFileSync(path.join(cliDirPath, 'cycode-cli'), 'modified');
      assert.strictEqual(verifyDirContentExactly(rootPath, cliDirPath, checksums), false);
    });

    test('rejects path traversal entries in the checksum db', () => {
      // the file exists and has the right checksum, but it is outside of the root directory
      const outsideDir = createTempDir();
      fs.writeFileSync(path.join(outsideDir, 'evil'), 'evil');
      const relativePathToEvil = path.relative(rootPath, path.join(outsideDir, 'evil'));

      try {
        assert.strictEqual(verifyDirContentExactly(rootPath, cliDirPath, {
          ...checksums, [relativePathToEvil]: sha256('evil'),
        }), false);
      } finally {
        fs.rmSync(outsideDir, { recursive: true, force: true });
      }
    });
  });

  suite('verifyDirContentChecksums', () => {
    test('rejects path traversal and absolute paths', () => {
      const outsideDir = createTempDir();
      const evilPath = path.join(outsideDir, 'evil');
      fs.writeFileSync(evilPath, 'evil');

      try {
        assert.strictEqual(verifyDirContentChecksums(rootPath, { [evilPath]: sha256('evil') }), false);
        assert.strictEqual(verifyDirContentChecksums(rootPath, {
          [path.relative(rootPath, evilPath)]: sha256('evil'),
        }), false);
        assert.strictEqual(verifyDirContentChecksums(rootPath, {
          'cycode-cli/../../evil': sha256('evil'),
        }), false);
      } finally {
        fs.rmSync(outsideDir, { recursive: true, force: true });
      }
    });
  });
});
