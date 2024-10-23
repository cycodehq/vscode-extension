import * as vscode from 'vscode';
import { container } from 'tsyringe';
import { validateConfig } from '../utils/config';
import { CycodeService, ICycodeService } from '../services/cycode-service';
import { CliScanType } from '../cli/models/cli-scan-type';
import { IStateService } from '../services/state-service';
import { StateServiceSymbol } from '../symbols';

export default async () => {
  if (validateConfig()) {
    return;
  }

  const stateService = container.resolve<IStateService>(StateServiceSymbol);
  if (!stateService.globalState.CliAuthed) {
    vscode.window.showErrorMessage('Please authenticate with Cycode first');
    return;
  }

  const cycodeService = container.resolve<ICycodeService>(CycodeService);

  const scanPromises = [];
  scanPromises.push(cycodeService.startScanForCurrentProject(CliScanType.Secret));
  scanPromises.push(cycodeService.startScanForCurrentProject(CliScanType.Sca));
  scanPromises.push(cycodeService.startScanForCurrentProject(CliScanType.Iac));
  scanPromises.push(cycodeService.startScanForCurrentProject(CliScanType.Sast));
  await Promise.all(scanPromises);
};
