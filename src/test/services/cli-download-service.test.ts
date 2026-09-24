import * as assert from 'assert';
import * as crypto from 'crypto';
import * as fs from 'fs';
import * as path from 'path';
import { execFileSync } from 'child_process';
import { CliDownloadService } from '../../services/cli-download-service';
import { IDownloadService } from '../../services/download-service';
import { IGithubReleaseService } from '../../services/github-release-service';
import { GlobalExtensionState, IStateService } from '../../services/state-service';
import { ILoggerService } from '../../services/logger-service';
import { GitHubReleaseAsset } from '../../services/github-release-service';
import { resetVscodeMock } from '../vscode-mock';
import { createTempDir, registerExtensionPath, registerLoggerMock } from '../helpers';

const sha256 = (content: string): string => crypto.createHash('sha256').update(content)
  .digest('hex');

const NEW_CLI_FILES: Record<string, string> = {
  'cycode-cli': 'new executable',
  '_internal/Python': 'new python',
};

suite('CliDownloadService.downloadOnedirCli', () => {
  let tempDir: string;
  let pluginPath: string;
  let pathToCliDir: string;
  let pathToArchive: string;
  let state: GlobalExtensionState;
  let service: CliDownloadService;

  const createArchive = (files: Record<string, string>) => {
    const archiveSourceDir = path.join(tempDir, 'archive-source');
    fs.rmSync(archiveSourceDir, { recursive: true, force: true });
    for (const [file, content] of Object.entries(files)) {
      fs.mkdirSync(path.dirname(path.join(archiveSourceDir, file)), { recursive: true });
      fs.writeFileSync(path.join(archiveSourceDir, file), content);
    }

    fs.rmSync(pathToArchive, { force: true });
    execFileSync('ditto', ['-c', '-k', archiveSourceDir, pathToArchive]);
  };

  // checksum db of NEW_CLI_FILES. paths are relative to the plugin directory
  const expectedChecksum = Object.entries(NEW_CLI_FILES)
    .map(([file, content]) => `${sha256(content)} cycode-cli/${file}`)
    .join('\n');

  setup(function () {
    if (process.platform !== 'darwin') {
      // onedir CLI and "ditto" are used only on macOS
      this.skip();
    }

    resetVscodeMock();
    const logger = registerLoggerMock();
    tempDir = createTempDir();
    pluginPath = registerExtensionPath(path.join(tempDir, 'extension'));
    pathToCliDir = path.join(pluginPath, 'cycode-cli');
    pathToArchive = path.join(tempDir, 'cycode-cli.zip');

    // previously installed working CLI
    fs.mkdirSync(path.join(pathToCliDir, '_internal'), { recursive: true });
    fs.writeFileSync(path.join(pathToCliDir, 'cycode-cli'), 'old executable');
    fs.writeFileSync(path.join(pathToCliDir, '_internal', 'old-only.so'), 'old file');

    const downloadService: IDownloadService = {
      retrieveFileTextContent: () => Promise.resolve(expectedChecksum),
      downloadFile: (_url: string, _checksum: string | undefined, localPath: string) => {
        fs.copyFileSync(pathToArchive, localPath);
        return Promise.resolve();
      },
    };

    state = new GlobalExtensionState();
    const stateService = { globalState: state, save: () => undefined } as unknown as IStateService;

    service = new CliDownloadService(
      downloadService,
      {} as IGithubReleaseService,
      stateService,
      logger as unknown as ILoggerService,
    );
    service.getAssetAndFileChecksum = () => Promise.resolve({
      asset: { browser_download_url: 'https://example.com/cycode-cli.zip' } as GitHubReleaseAsset,
      expectedChecksum,
    });
  });

  teardown(() => {
    if (tempDir) {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });

  const readCliExecutable = () => fs.readFileSync(path.join(pathToCliDir, 'cycode-cli'), 'utf8');
  const leftovers = () => fs.readdirSync(pluginPath).filter((entry) => entry !== 'cycode-cli');

  test('replaces the previous CLI with the verified new one', async () => {
    createArchive(NEW_CLI_FILES);
    await service.downloadOnedirCli();

    assert.strictEqual(readCliExecutable(), 'new executable');
    assert.strictEqual(fs.existsSync(path.join(pathToCliDir, '_internal', 'old-only.so')), false);
    assert.strictEqual(fs.statSync(path.join(pathToCliDir, 'cycode-cli')).mode & 0o777, 0o755);
    const savedFiles = Object.keys(state.CliDirHashes ?? {}).sort();
    assert.deepStrictEqual(savedFiles, ['cycode-cli/_internal/Python', 'cycode-cli/cycode-cli']);
    assert.deepStrictEqual(leftovers(), []);
  });

  const invalidArchives: Record<string, Record<string, string>> = {
    'an extra file': { ...NEW_CLI_FILES, '_internal/injected.dylib': 'malicious' },
    'a modified file': { ...NEW_CLI_FILES, 'cycode-cli': 'tampered executable' },
    'a missing file': { 'cycode-cli': NEW_CLI_FILES['cycode-cli'] },
  };
  for (const [caseName, files] of Object.entries(invalidArchives)) {
    test(`keeps the previous CLI when the archive contains ${caseName}`, async () => {
      createArchive(files);
      await assert.rejects(service.downloadOnedirCli(), /checksum verification failed/);

      assert.strictEqual(readCliExecutable(), 'old executable');
      assert.strictEqual(fs.existsSync(path.join(pathToCliDir, '_internal', 'old-only.so')), true);
      assert.strictEqual(state.CliDirHashes, null);
      assert.deepStrictEqual(leftovers(), []);
    });
  }

  test('keeps the previous CLI when the archive can not be extracted', async () => {
    fs.writeFileSync(pathToArchive, 'not a zip');
    await assert.rejects(service.downloadOnedirCli());

    assert.strictEqual(readCliExecutable(), 'old executable');
    assert.deepStrictEqual(leftovers(), []);
  });
});
