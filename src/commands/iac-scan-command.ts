import * as vscode from 'vscode';
import { container } from 'tsyringe';
import TrayNotifications from '../utils/tray-notifications';
import { CycodeService, ICycodeService } from '../services/cycode-service';
import { CliScanType } from '../cli/models/cli-scan-type';
import { getCommonCommand } from './common';

export default getCommonCommand(async () => {
  // scan the current open document if opened
  if (!vscode.window.activeTextEditor?.document || vscode.window.activeTextEditor.document.uri.scheme === 'output') {
    TrayNotifications.showMustBeFocusedOnFile();
    return;
  }

  const cycodeService = container.resolve<ICycodeService>(CycodeService);
  await cycodeService.startScan(CliScanType.Iac, [vscode.window.activeTextEditor.document.fileName], true);
});
