import * as vscode from 'vscode';
import {config, validateConfig} from '../utils/config';
import {auth} from '../services/auth';

export default () => {
  if (validateConfig()) {
    return;
  }

  const params = {
    config,
    workspaceFolderPath:
            vscode.workspace.workspaceFolders?.[0]?.uri.fsPath || '',
  };

  auth(params);
};
