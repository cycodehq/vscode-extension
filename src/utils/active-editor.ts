import * as vscode from 'vscode';

export const getActiveFilePath = (): string | undefined => {
  const activeDocument = vscode.window.activeTextEditor?.document;
  if (!activeDocument || activeDocument.uri.scheme === 'output') {
    return undefined;
  }

  return activeDocument.fileName;
};
