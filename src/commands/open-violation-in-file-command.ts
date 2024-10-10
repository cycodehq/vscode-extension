import * as vscode from 'vscode';

export default async (fullFilePath: string, lineNumber: number) => {
  const vscodeLineNumber = lineNumber - 1;
  const uri = vscode.Uri.file(fullFilePath);
  await vscode.window.showTextDocument(uri, {
    viewColumn: vscode.ViewColumn.One,
    selection: new vscode.Range(vscodeLineNumber, 0, vscodeLineNumber, 0),
  });
};
