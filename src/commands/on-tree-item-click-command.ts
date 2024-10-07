import * as vscode from 'vscode';
import {VscodeCommands} from './index';
import {TreeViewDisplayedData} from '../providers/tree-view/types';

export default async (fullFilePath: string, violation: TreeViewDisplayedData) => {
  await vscode.commands.executeCommand(VscodeCommands.OpenViolationInFile, fullFilePath, violation.lineNumber);
  vscode.commands.executeCommand(VscodeCommands.OpenViolationPanel, violation.detectionType, violation.detection);
};
