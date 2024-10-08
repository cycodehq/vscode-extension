import * as vscode from 'vscode';
import {VscodeCommands} from './index';
import {TreeDisplayedData} from '../providers/tree-data/types';

export default async (fullFilePath: string, violation: TreeDisplayedData) => {
  await vscode.commands.executeCommand(VscodeCommands.OpenViolationInFile, fullFilePath, violation.lineNumber);
  vscode.commands.executeCommand(VscodeCommands.OpenViolationPanel, violation.detectionType, violation.detection);
};
