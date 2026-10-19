import * as assert from 'assert';
import * as fs from 'fs';
import * as path from 'path';
import { isPathInsideAnyRoot } from '../../utils/path-containment';
import { createTempDir } from '../helpers';

suite('isPathInsideAnyRoot', () => {
  let tempDir: string;
  let projectDir: string;
  let outsideFile: string;

  setup(() => {
    tempDir = createTempDir();
    projectDir = path.join(tempDir, 'project');
    fs.mkdirSync(path.join(projectDir, 'sub dir'), { recursive: true });
    fs.writeFileSync(path.join(projectDir, 'sub dir', 'file.py'), 'content');
    fs.writeFileSync(path.join(projectDir, '..file'), 'content');

    outsideFile = path.join(tempDir, 'id_rsa');
    fs.writeFileSync(outsideFile, 'private key');
  });

  teardown(() => {
    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  test('accepts files inside the root directory', () => {
    assert.strictEqual(isPathInsideAnyRoot(path.join(projectDir, 'sub dir', 'file.py'), [projectDir]), true);
    assert.strictEqual(isPathInsideAnyRoot(path.join(projectDir, '..file'), [projectDir]), true);
  });

  test('accepts the root file itself', () => {
    const file = path.join(projectDir, 'sub dir', 'file.py');
    assert.strictEqual(isPathInsideAnyRoot(file, [file]), true);
  });

  test('accepts files inside any of the roots', () => {
    const file = path.join(projectDir, 'sub dir', 'file.py');
    assert.strictEqual(isPathInsideAnyRoot(file, [outsideFile, path.join(projectDir, 'sub dir')]), true);
  });

  test('rejects files outside of the roots', () => {
    assert.strictEqual(isPathInsideAnyRoot(outsideFile, [projectDir]), false);
    assert.strictEqual(isPathInsideAnyRoot(outsideFile, []), false);
  });

  test('rejects path traversal', () => {
    assert.strictEqual(isPathInsideAnyRoot(`${projectDir}/sub dir/../../id_rsa`, [projectDir]), false);
  });

  test('rejects sibling directories with the same prefix', () => {
    const siblingDir = `${projectDir}-evil`;
    fs.mkdirSync(siblingDir);
    fs.writeFileSync(path.join(siblingDir, 'file'), 'content');
    assert.strictEqual(isPathInsideAnyRoot(path.join(siblingDir, 'file'), [projectDir]), false);
  });

  test('rejects symlinks inside the root which point outside of it', () => {
    const link = path.join(projectDir, 'link.txt');
    fs.symlinkSync(outsideFile, link);
    assert.strictEqual(isPathInsideAnyRoot(link, [projectDir]), false);

    const dirLink = path.join(projectDir, 'dir-link');
    fs.symlinkSync(tempDir, dirLink);
    assert.strictEqual(isPathInsideAnyRoot(path.join(dirLink, 'id_rsa'), [projectDir]), false);
  });

  test('accepts symlinks which point inside the root', () => {
    const link = path.join(projectDir, 'link.py');
    fs.symlinkSync(path.join(projectDir, 'sub dir', 'file.py'), link);
    assert.strictEqual(isPathInsideAnyRoot(link, [projectDir]), true);
  });

  test('rejects not existing files', () => {
    assert.strictEqual(isPathInsideAnyRoot(path.join(projectDir, 'missing.py'), [projectDir]), false);
    assert.strictEqual(isPathInsideAnyRoot(path.join(projectDir, 'sub dir', 'file.py'), [`${projectDir}-x`]), false);
  });
});
