import * as vscode from 'vscode';
import {ScanType} from '../../constants';

const _scanTypeToPanelMap: Map<ScanType, vscode.WebviewPanel> = new Map();

const _scanTypeToPanelTitleMap = new Map([
  [ScanType.Sca, 'Cycode: Open Source Threat Detection Details'],
  [ScanType.Secrets, 'Cycode: Hardcoded Secret Detection Details'],
  [ScanType.Iac, 'Cycode: Infrastructure as Code Detection Details'],
]);

export const getPanel = (scanType: ScanType) => {
  return _scanTypeToPanelMap.get(scanType);
};

export const createPanel = (scanType: ScanType): vscode.WebviewPanel => {
  const panel = vscode.window.createWebviewPanel(
      'detectionDetails',
      _scanTypeToPanelTitleMap.get(scanType) || 'Cycode: Detection Details',
      vscode.ViewColumn.Two,
      {
        enableScripts: true,
      }
  );

  _scanTypeToPanelMap.set(scanType, panel);

  return panel;
};

export const revealPanel = (scanType: ScanType) => {
  const panel = getPanel(scanType);
  if (panel) {
    panel.reveal(vscode.ViewColumn.Two);
  }
};

export const removePanel = (scanType: ScanType) => {
  const panel = getPanel(scanType);
  if (panel) {
    _scanTypeToPanelMap.delete(scanType);
  }
};
