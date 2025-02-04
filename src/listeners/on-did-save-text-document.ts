import * as vscode from 'vscode';
import { container } from 'tsyringe';
import { config, validateConfig } from '../utils/config';
import { isSupportedIacFile, isSupportedPackageFile } from '../constants';
import { getVsCodeRootPathPrefix } from '../utils/global-config';
import { CycodeService, ICycodeService } from '../services/cycode-service';
import { CliScanType } from '../cli/models/cli-scan-type';
import { IStateService } from '../services/state-service';
import { StateServiceSymbol } from '../symbols';

export const OnDidSaveTextDocument = (document: vscode.TextDocument) => {
  if (!config.scanOnSaveEnabled) {
    return;
  }

  if (validateConfig()) {
    return;
  }

  const stateService = container.resolve<IStateService>(StateServiceSymbol);
  if (!stateService.tempState.CliAuthed) {
    return;
  }

  const fileFsPath = document.uri.fsPath;
  if (!fileFsPath) {
    return;
  }

  const vsCodeAppRootPrefix = getVsCodeRootPathPrefix();
  if (fileFsPath.startsWith(vsCodeAppRootPrefix)) {
    // user can trigger save of a VS Code settings files which we don't want to scan
    return;
  }

  const cycodeService = container.resolve<ICycodeService>(CycodeService);

  if (stateService.tempState.IsScaScanningEnabled && isSupportedPackageFile(document.fileName)) {
    void cycodeService.startScan(CliScanType.Sca, [fileFsPath], false);
  }

  if (stateService.tempState.IsIacScanningEnabled && isSupportedIacFile(document.fileName)) {
    void cycodeService.startScan(CliScanType.Iac, [fileFsPath], false);
  }

  // run Secrets scan on any saved file. CLI will exclude irrelevant files
  if (stateService.tempState.IsSecretScanningEnabled) {
    void cycodeService.startScan(CliScanType.Secret, [fileFsPath], false);
  }
};

export const registerOnDidSaveTextDocument = (context: vscode.ExtensionContext) => {
  const onDidSaveTextDocumentDisposable = vscode.workspace.onDidSaveTextDocument(OnDidSaveTextDocument);
  context.subscriptions.push(onDidSaveTextDocumentDisposable);
};
