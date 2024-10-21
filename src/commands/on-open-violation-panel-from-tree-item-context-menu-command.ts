import * as vscode from 'vscode';
import { VscodeCommands } from './index';
import { TreeItem } from '../providers/tree-data/item';

export default (item: TreeItem) => {
  vscode.commands.executeCommand(
    VscodeCommands.OpenViolationPanel,
    item.vulnerability?.detectionType,
    item.vulnerability?.detection);
};
