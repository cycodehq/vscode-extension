import * as vscode from 'vscode';
import { refreshDiagnosticCollectionData } from '../providers/diagnostics/common';
import { container } from 'tsyringe';
import { IExtensionService } from '../services/extension-service';
import { ExtensionServiceSymbol } from '../symbols';

export const OnDidChangeActiveTextEditor = (editor: vscode.TextEditor | undefined) => {
  if (!editor) {
    return;
  }

  const extension = container.resolve<IExtensionService>(ExtensionServiceSymbol);

  // TODO(MarshalX): refresh only for editor.document if we will need better performance
  void refreshDiagnosticCollectionData(extension.diagnosticCollection);
};

export const registerOnDidChangeActiveTextEditor = (context: vscode.ExtensionContext) => {
  const onDidChangeActiveTextEditorDisposable = vscode.window.onDidChangeActiveTextEditor(OnDidChangeActiveTextEditor);
  context.subscriptions.push(onDidChangeActiveTextEditorDisposable);
};
