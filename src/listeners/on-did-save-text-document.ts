import * as vscode from 'vscode';
import { container } from 'tsyringe';
import { config, validateConfig } from '../utils/config';
import { isSupportedIacFile, isSupportedPackageFile, ScanType } from '../constants';
import { getVsCodeRootPathPrefix } from '../utils/global-config';
import { CycodeService, ICycodeService } from '../services/cycode-service';

export const OnDidSaveTextDocument = (document: vscode.TextDocument) => {
  if (!config.scanOnSaveEnabled) {
    return;
  }

  if (validateConfig()) {
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

  if (isSupportedPackageFile(document.fileName)) {
    void cycodeService.startScan(ScanType.Sca, [fileFsPath], false);
  }

  if (isSupportedIacFile(document.fileName)) {
    void cycodeService.startScan(ScanType.Iac, [fileFsPath], false);
  }

  // run Secrets scan on any saved file. CLI will exclude irrelevant files
  void cycodeService.startScan(ScanType.Secret, [fileFsPath], false);
};

export const registerOnDidSaveTextDocument = (context: vscode.ExtensionContext) => {
  const onDidSaveTextDocumentDisposable = vscode.workspace.onDidSaveTextDocument(OnDidSaveTextDocument);
  context.subscriptions.push(onDidSaveTextDocumentDisposable);
};
