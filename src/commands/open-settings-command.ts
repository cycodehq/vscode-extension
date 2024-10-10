import * as vscode from 'vscode';

export default () => {
  vscode.commands.executeCommand('workbench.action.openSettings', 'cycode');
};
