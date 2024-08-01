import * as vscode from 'vscode';

export const validateTextRangeInOpenDoc = (uri: vscode.Uri, range: vscode.Range): boolean => {
  const document = vscode.workspace.textDocuments.find((doc) => doc.uri.toString() === uri.toString());
  if (!document) {
    // the document is not open; cannot validate
    return false;
  }

  // out of line bounds check
  if (range.start.line >= document.lineCount || range.end.line >= document.lineCount) {
    return false;
  }

  const startChar = document.lineAt(range.start.line).range.start.character;
  const endChar = document.lineAt(range.end.line).range.end.character;

  // out of character bounds check
  return !(range.start.character < startChar || range.end.character > endChar);
};
