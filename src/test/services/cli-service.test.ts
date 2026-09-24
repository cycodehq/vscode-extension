import * as assert from 'assert';
import * as fs from 'fs';
import * as path from 'path';
import { CliService } from '../../services/cli-service';
import { IStateService } from '../../services/state-service';
import { ILoggerService } from '../../services/logger-service';
import { IScanResultsService } from '../../services/scan-results-service';
import { IExtensionService } from '../../services/extension-service';
import { DetectionBase } from '../../cli/models/scan-result/detection-base';
import { resetVscodeMock, settings } from '../vscode-mock';
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
});
