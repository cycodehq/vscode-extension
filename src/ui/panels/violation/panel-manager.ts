import * as vscode from 'vscode';
import { CliScanType } from '../../../cli/models/cli-scan-type';

const _scanTypeToPanelMap = new Map<CliScanType, vscode.WebviewPanel>();

const _scanTypeToPanelTitleMap = new Map([
  [CliScanType.Sca, 'Cycode: Open Source Threat Detection Details'],
  [CliScanType.Secret, 'Cycode: Hardcoded Secret Detection Details'],
  [CliScanType.Iac, 'Cycode: Infrastructure as Code Detection Details'],
  [CliScanType.Sast, 'Cycode: Code Security Detection Details'],
]);

export const getPanel = (scanType: CliScanType) => {
  return _scanTypeToPanelMap.get(scanType);
};

export const createPanel = (scanType: CliScanType): vscode.WebviewPanel => {
  const panel = vscode.window.createWebviewPanel(
    'detectionDetails',
    _scanTypeToPanelTitleMap.get(scanType) ?? 'Cycode: Detection Details',
    vscode.ViewColumn.Two,
    {
      enableScripts: true,
    },
  );

  _scanTypeToPanelMap.set(scanType, panel);

  return panel;
};

export const revealPanel = (scanType: CliScanType) => {
  const panel = getPanel(scanType);
  if (panel) {
    panel.reveal(vscode.ViewColumn.Two);
  }
};

export const removePanel = (scanType: CliScanType) => {
  const panel = getPanel(scanType);
  if (panel) {
    panel.dispose();
    _scanTypeToPanelMap.delete(scanType);
  }
};
