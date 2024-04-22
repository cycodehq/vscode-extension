import * as vscode from 'vscode';
import {ActionCommandMapping, CycodeView} from '../cycode-view';
import {ExecuteCommandMessages} from '../utils';
import {VscodeCommands} from '../../utils/commands';
import content from './content';
import {config} from '../../utils/config';


export default class ScanView extends CycodeView {
  public static readonly viewType = 'activity_bar.scanView';

  constructor() {
    const actionCommandMapping: ActionCommandMapping[] = [
      {
        command: VscodeCommands.SecretScanForProjectCommandId,
        commandMessage: ExecuteCommandMessages.SecretScan,
      },
      {
        command: VscodeCommands.ScaScanCommandId,
        commandMessage: ExecuteCommandMessages.ScaScan,
      },
      {
        command: VscodeCommands.IacScanForProjectCommandId,
        commandMessage: ExecuteCommandMessages.IacScan,
      },
      {
        command: VscodeCommands.SastScanForProjectCommandId,
        commandMessage: ExecuteCommandMessages.SastScan,
      },
      {
        command: VscodeCommands.OpenSettingsCommandId,
        commandMessage: ExecuteCommandMessages.OpenCycodeSettings,
      },
    ];
    super(content, actionCommandMapping);
  }

  public resolveWebviewView(webviewView: vscode.WebviewView): void {
    super.resolveWebviewView(webviewView);
    this._view?.webview.postMessage({isSastSupported: config.experimentalSastSupport});
  }
}
