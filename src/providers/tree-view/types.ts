import {TreeViewItem} from './item';
import {TreeViewDataProvider} from './provider';

import * as vscode from 'vscode';
import {AnyDetection} from '../../types/detection';

export interface TreeView {
  provider: TreeViewDataProvider;
  view: vscode.TreeView<TreeViewItem>;
}

export interface TreeViewDisplayedData {
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
