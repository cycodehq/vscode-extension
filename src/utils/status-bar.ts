import * as vscode from 'vscode';
import {VscodeCommands} from './commands';
import {StatusBarTexts} from './texts';

let statusBar: vscode.StatusBarItem | null = null;

export enum StatusBarColor {
  info = 'statusBarItem.infoBackground',
  error = 'statusBarItem.errorBackground',
  warning = 'statusBarItem.warningBackground',
}

const getStatusBar = () => {
  if (!statusBar) {
    statusBar = vscode.window.createStatusBarItem(
        vscode.StatusBarAlignment.Right,
        0
    );
    statusBar.command = VscodeCommands.ScanCommandId;
    statusBar.text = StatusBarTexts.ScanButton;
    statusBar.show();
  }

  return statusBar;
};

export const update = ({
  text,
  hide,
  color = StatusBarColor.info,
  command,
}: {
  text: string;
  hide?: boolean;
  color?: StatusBarColor;
  command?: string;
}) => {
  const bar = getStatusBar();
  bar.text = text;
  bar.backgroundColor = new vscode.ThemeColor(color);

  hide ? bar.hide() : bar.show();
  if (command) {
    bar.command = command;
  }
};

export const showDefault = () => {
  update({
    text: StatusBarTexts.ScanButton,
    command: VscodeCommands.ScanCommandId,
  });
};

export const showScanningInProgress = () => {
  update({text: StatusBarTexts.ScanWait, command: ''});
};

export const showScanComplete = () => {
  update({text: StatusBarTexts.ScanComplete});
};

export const showScanError = () => {
  update({
    text: StatusBarTexts.ScanError,
    color: StatusBarColor.error,
  });
};

export const showAuthIsRequired = () => {
  update({
    text: StatusBarTexts.AuthIsRequired,
    color: StatusBarColor.warning,
    command: 'workbench.view.extension.cycode',
  });
};

export const showAuthError = () => {
  update({
    text: StatusBarTexts.AuthError,
    color: StatusBarColor.error,
    command: 'workbench.view.extension.cycode',
  });
};

export const showCliPathError = () => {
  update({
    text: StatusBarTexts.CliPathWarning,
    color: StatusBarColor.warning,
    command: 'workbench.view.extension.cycode',
  });
};

const module = {
  create: getStatusBar,
  update,
  showDefault,
  showScanningInProgress,
  showScanComplete,
  showScanError,
  showAuthError,
  showCliPathError,
  showAuthIsRequired,
  get statusBar() {
    return getStatusBar();
  },
};

export default module;
