import * as assert from 'assert';
import * as fs from 'fs';
import * as path from 'path';
import { CliService } from '../../services/cli-service';
import { IStateService } from '../../services/state-service';
import { ILoggerService } from '../../services/logger-service';
import { IScanResultsService } from '../../services/scan-results-service';
import { IExtensionService } from '../../services/extension-service';
import { CliScanType } from '../../cli/models/cli-scan-type';
import { DiffScanMode } from '../../cli/constants';
import { resetVscodeMock, settings } from '../vscode-mock';
import { createTempDir, registerExtensionPath, registerLoggerMock } from '../helpers';

// fake CLI: records the arguments it was started with and prints an empty scan result
const FAKE_CLI_SOURCE = `#!${process.execPath}
require('fs').writeFileSync(process.env.FAKE_CLI_ARGS, JSON.stringify(process.argv.slice(2)));
process.stdout.write(JSON.stringify({ detections: [], errors: [] }));
`;

suite('CliService.scanDiff', () => {
  let tempDir: string;
  let argsPath: string;
  let projectDir: string;
  let service: CliService;

  // the arguments of the scan command itself, without the global --output / --user-agent options
  const getScanArgs = (): string[] => {
    const args = JSON.parse(fs.readFileSync(argsPath, 'utf8')) as string[];
    return args.slice(args.indexOf('scan'));
  };

  setup(function () {
    if (process.platform === 'win32') {
      // the fake CLI is a script with a shebang
      this.skip();
    }

    resetVscodeMock();
    const logger = registerLoggerMock();
    tempDir = createTempDir();
    registerExtensionPath(tempDir);

    // a name full of characters that matter to a shell
    projectDir = path.join(tempDir, 'R&D $HOME (2); echo');
    fs.mkdirSync(projectDir);

    argsPath = path.join(tempDir, 'cli-args.json');
    process.env.FAKE_CLI_ARGS = argsPath;
    const fakeCliPath = path.join(tempDir, 'fake-cli');
    fs.writeFileSync(fakeCliPath, FAKE_CLI_SOURCE, { mode: 0o755 });
    settings.cliPath = fakeCliPath;

    service = new CliService(
      { globalState: {}, tempState: {} } as unknown as IStateService,
      logger as unknown as ILoggerService,
      { setDetections: () => undefined } as unknown as IScanResultsService,
      { refreshProviders: () => Promise.resolve() } as unknown as IExtensionService,
    );
  });

  teardown(() => {
    delete process.env.FAKE_CLI_ARGS;
    if (tempDir) {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });

  test('runs a commit range scan through commit-history', async () => {
    await service.scanDiff(CliScanType.Secret, DiffScanMode.CommitRange, 'main...feature/x', projectDir);

    assert.deepStrictEqual(
      getScanArgs(),
      ['scan', '-t', 'secret', '--sync', 'commit-history', '--commit-range', 'main...feature/x', projectDir],
    );
  });

  test('runs a local diff scan through pre-commit with the unstaged changes included', async () => {
    await service.scanDiff(CliScanType.Sca, DiffScanMode.LocalDiff, 'HEAD', projectDir);

    assert.deepStrictEqual(
      getScanArgs(),
      [
        'scan', '-t', 'sca', '--sync', '--no-restore',
        'pre-commit', '--include-unstaged', '--base-ref', 'HEAD', '--path', projectDir,
      ],
    );
  });

  test('keeps the scanner specific options', async () => {
    await service.scanDiff(CliScanType.Sast, DiffScanMode.LocalDiff, 'HEAD', projectDir);

    // SAST scans do not use --sync
    assert.deepStrictEqual(
      getScanArgs(),
      ['scan', '-t', 'sast', 'pre-commit', '--include-unstaged', '--base-ref', 'HEAD', '--path', projectDir],
    );
  });

  test('passes paths with shell characters through unchanged', async () => {
    await service.scanDiff(CliScanType.Secret, DiffScanMode.LocalDiff, 'HEAD', projectDir);

    const scanArgs = getScanArgs();
    assert.strictEqual(scanArgs[scanArgs.length - 1], projectDir);
  });

  test('does not support IaC', async () => {
    await assert.rejects(
      service.scanDiff(CliScanType.Iac, DiffScanMode.CommitRange, 'main...feature', projectDir),
      /not supported/,
    );
    assert.strictEqual(fs.existsSync(argsPath), false, 'the CLI must not be started');
  });

  test('rejects a ref that would be read as a CLI option before starting the CLI', async () => {
    await assert.rejects(
      service.scanDiff(CliScanType.Secret, DiffScanMode.LocalDiff, '--version', projectDir),
      /Invalid git ref/,
    );
    assert.strictEqual(fs.existsSync(argsPath), false, 'the CLI must not be started');
  });
});
