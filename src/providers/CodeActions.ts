import * as vscode from "vscode";
import { VscodeCommands } from "../utils/commands";

export const IGNORE_ACTION = "ignore";

export class CycodeActions implements vscode.CodeActionProvider {
  public static readonly providedCodeActionKinds = [
    vscode.CodeActionKind.QuickFix,
  ];

  provideCodeActions(
    document: vscode.TextDocument,
    range: vscode.Range | vscode.Selection,
    context: vscode.CodeActionContext,
    token: vscode.CancellationToken
  ): vscode.CodeAction[] {
    return context.diagnostics.map((diagnostic) =>
      this.createCommandCodeAction(diagnostic)
    );
  }

  private createCommandCodeAction(
    diagnostic: vscode.Diagnostic
  ): vscode.CodeAction {
    const action = new vscode.CodeAction(
      `ignore rule ${diagnostic.code}`,
      vscode.CodeActionKind.QuickFix
    );

    action.command = {
      command: VscodeCommands.IgnoreCommandId,
      title: `Ignore rule ID: ${diagnostic.code}`,
      tooltip: "This will always ignore this rule type",
      arguments: [diagnostic.code],
    };

    action.diagnostics = [diagnostic];
    action.isPreferred = true;
    return action;
  }
}
