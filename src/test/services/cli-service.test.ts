import * as assert from 'assert';
import * as fs from 'fs';
import * as path from 'path';
import { CliService } from '../../services/cli-service';
import { IStateService } from '../../services/state-service';
import { ILoggerService } from '../../services/logger-service';
import { IScanResultsService } from '../../services/scan-results-service';
import { IExtensionService } from '../../services/extension-service';
import { DetectionBase } from '../../cli/models/scan-result/detection-base';
import { resetVscodeMock, settings, window } from '../vscode-mock';
import { createTempDir, registerExtensionPath, registerLoggerMock } from '../helpers';

// fake CLI: prints the prepared scan result
const FAKE_CLI_SOURCE = `#!${process.execPath}
process.stdout.write(require('fs').readFileSync(process.env.FAKE_CLI_OUTPUT, 'utf8'));
`;

// the CLI output is in snake case
/* eslint-disable camelcase */
const createSecretDetection = (filePath: string, fileName: string) => ({
  id: fileName,
  message: 'Secret',
  type: 'generic-password',
  severity: 'High',
  detection_rule_id: 'rule',
  detection_type_id: 'type',
  detection_details: {
    file_path: filePath,
    file_name: fileName,
    start_position: 0,
    length: 5,
    line: 0,
    sha512: 'sha',
  },
});
/* eslint-enable camelcase */

suite('CliService scan results', () => {
  let tempDir: string;
  let projectDir: string;
  let savedDetections: DetectionBase[] | undefined;
  let service: CliService;
  let notifications: string[];
  const originalShowInformationMessage = window.showInformationMessage;

  setup(function () {
    if (process.platform === 'win32') {
      // the fake CLI is a script with a shebang
      this.skip();
    }

    resetVscodeMock();
    const logger = registerLoggerMock();
    tempDir = createTempDir();
    registerExtensionPath(tempDir);

    projectDir = path.join(tempDir, 'project');
    fs.mkdirSync(projectDir);
    fs.writeFileSync(path.join(projectDir, 'config.py'), 'password = "secret"');

    // a file outside of the project and a symlink to it inside the project
    const outsideFile = path.join(tempDir, 'id_rsa');
    fs.writeFileSync(outsideFile, 'private key');
    fs.symlinkSync(outsideFile, path.join(projectDir, 'link.txt'));

    const scanResult = {
      detections: [
        createSecretDetection(`${projectDir}/`, 'config.py'),
        createSecretDetection(`${projectDir}/`, 'link.txt'),
        createSecretDetection(`${tempDir}/`, 'id_rsa'),
        createSecretDetection(`${projectDir}/../`, 'id_rsa'),
      ],
      errors: [],
    };
    const scanResultPath = path.join(tempDir, 'scan-result.json');
    fs.writeFileSync(scanResultPath, JSON.stringify(scanResult));
    process.env.FAKE_CLI_OUTPUT = scanResultPath;

    const fakeCliPath = path.join(tempDir, 'fake-cli');
    fs.writeFileSync(fakeCliPath, FAKE_CLI_SOURCE, { mode: 0o755 });
    settings.cliPath = fakeCliPath;

    notifications = [];
    window.showInformationMessage = (...args: unknown[]) => {
      notifications.push(String(args[0]).replace(/\s+/g, ' '));
      return Promise.resolve(undefined);
    };

    savedDetections = undefined;
    const scanResultsService = {
      setDetections: (_scanType: unknown, detections: DetectionBase[]) => {
        savedDetections = detections;
      },
    } as unknown as IScanResultsService;

    service = new CliService(
      { globalState: {}, tempState: {} } as unknown as IStateService,
      logger as unknown as ILoggerService,
      scanResultsService,
      { refreshProviders: () => Promise.resolve() } as unknown as IExtensionService,
    );
  });

  teardown(() => {
    window.showInformationMessage = originalShowInformationMessage;
    delete process.env.FAKE_CLI_OUTPUT;
    if (tempDir) {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });

  test('accepts only detections of files inside the scanned paths', async () => {
    await service.scanPathsSecrets([projectDir]);

    assert.ok(savedDetections);
    assert.deepStrictEqual(
      savedDetections.map((detection) => detection.detectionDetails.getFilepath()),
      [`${projectDir}/config.py`],
    );
  });

  test('accepts detections of a scanned file', async () => {
    await service.scanPathsSecrets([path.join(projectDir, 'config.py')]);

    assert.ok(savedDetections);
    assert.strictEqual(savedDetections.length, 1);
  });

  const writeScanResult = (detections: unknown[]) => {
    const outputPath = process.env.FAKE_CLI_OUTPUT;
    assert.ok(outputPath);
    fs.writeFileSync(outputPath, JSON.stringify({ detections, errors: [] }));
  };

  test('tells the user how many findings are not shown', async () => {
    await service.scanPathsSecrets([projectDir], true);

    assert.strictEqual(notifications.length, 1);
    assert.match(notifications[0], /detected 1 .* issues/);
    assert.match(notifications[0], /3 more findings are in files outside of the scanned paths or that no longer exist/);
  });

  test('does not claim a clean scan when every finding was left out', async () => {
    writeScanResult([createSecretDetection(`${tempDir}/`, 'id_rsa')]);

    await service.scanPathsSecrets([projectDir], true);

    assert.strictEqual(notifications.length, 1);
    assert.match(notifications[0], /issues to show\. 1 more finding is in files outside/);
    assert.doesNotMatch(notifications[0], /were found/);
  });

  test('says nothing extra when no finding was left out', async () => {
    writeScanResult([createSecretDetection(`${projectDir}/`, 'config.py')]);

    await service.scanPathsSecrets([projectDir], true);

    assert.strictEqual(notifications.length, 1);
    assert.doesNotMatch(notifications[0], /not shown/);
  });

  test('reports a clean scan when there are no findings at all', async () => {
    writeScanResult([]);

    await service.scanPathsSecrets([projectDir], true);

    assert.strictEqual(notifications.length, 1);
    assert.match(notifications[0], /issues were found\./);
  });
});
