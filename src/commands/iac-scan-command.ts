import * as vscode from 'vscode';
import { container } from 'tsyringe';
import TrayNotifications from '../utils/tray-notifications';
import { validateConfig } from '../utils/config';
import { CycodeService, ICycodeService } from '../services/cycode-service';
import { CliScanType } from '../cli/models/cli-scan-type';

export default () => {
  // scan the current open document if opened

  if (validateConfig()) {
    return;
  }

  if (!vscode.window.activeTextEditor?.document || vscode.window.activeTextEditor.document.uri.scheme === 'output') {
    TrayNotifications.showMustBeFocusedOnFile();
    return;
  }

  const cycodeService = container.resolve<ICycodeService>(CycodeService);
  void cycodeService.startScan(CliScanType.Iac, [vscode.window.activeTextEditor.document.fileName], true);
};
