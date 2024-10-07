import * as vscode from 'vscode';
import {VscodeCommands} from './index';
import {TreeViewItem} from '../providers/tree-view/item';

export default (item: TreeViewItem) => {
  vscode.commands.executeCommand(
      VscodeCommands.OpenViolationInFile,
      item.fullFilePath,
      item.vulnerability?.lineNumber
  );
};
