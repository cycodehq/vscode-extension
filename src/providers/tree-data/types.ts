import {TreeItem} from './item';
import {TreeDataProvider} from './provider';

import * as vscode from 'vscode';
import {AnyDetection} from '../../types/detection';

export interface TreeView {
  provider: TreeDataProvider;
  view: vscode.TreeView<TreeItem>;
}

export interface TreeDisplayedData {
  title: string;
  severityFirstLetter: SeverityFirstLetter;
  lineNumber: number; // converted to vscode line number
  detection: AnyDetection; // plain detection data from CLI
  detectionType: string;
}

export enum SeverityFirstLetter {
  Info = 'I',
  Low = 'L',
  High = 'H',
  Medium = 'M',
  Critical = 'C',
}
