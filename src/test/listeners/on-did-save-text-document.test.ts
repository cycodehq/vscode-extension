import * as assert from 'assert';
import * as vscode from 'vscode';
import { container } from 'tsyringe';
import { OnDidSaveTextDocument } from '../../listeners/on-did-save-text-document';
import { CycodeService } from '../../services/cycode-service';
import { StateServiceSymbol } from '../../symbols';
import { CliScanType } from '../../cli/models/cli-scan-type';
import { resetVscodeMock, settings, workspace } from '../vscode-mock';
import { createTempDir, registerExtensionPath, registerLoggerMock } from '../helpers';

suite('OnDidSaveTextDocument', () => {
  let startedScans: CliScanType[];

  const document = {
    fileName: '/project/src/index.ts',
    uri: { fsPath: '/project/src/index.ts' },
  } as unknown as vscode.TextDocument;

  setup(() => {
    resetVscodeMock();
    registerLoggerMock();
    registerExtensionPath(createTempDir());

    // an existing file, so the config validation passes
    settings.cliPath = process.execPath;
    settings.scanOnSave = true;

    startedScans = [];
    container.register(CycodeService, {
      useValue: {
        startScan: (scanType: CliScanType) => {
          startedScans.push(scanType);
          return Promise.resolve();
        },
      } as unknown as CycodeService,
    });
    container.register(StateServiceSymbol, {
      useValue: {
        tempState: {
          CliAuthed: true,
          IsSecretScanningEnabled: true,
          IsScaScanningEnabled: true,
          IsIacScanningEnabled: true,
        },
      },
    });
  });

  test('scans the saved file in a trusted workspace', () => {
    OnDidSaveTextDocument(document);
    assert.deepStrictEqual(startedScans, [CliScanType.Secret]);
  });

  test('does not scan automatically in Restricted Mode (untrusted workspace)', () => {
    workspace.isTrusted = false;
    OnDidSaveTextDocument(document);
    assert.deepStrictEqual(startedScans, []);
  });

  test('does not scan when scan on save is disabled', () => {
    settings.scanOnSave = false;
    OnDidSaveTextDocument(document);
    assert.deepStrictEqual(startedScans, []);
  });
});
