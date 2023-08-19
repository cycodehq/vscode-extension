import * as vscode from "vscode";
import { VscodeCommands } from "../utils/commands";
import { CommandParameters } from "../cli-wrapper/constants";
import { IgnoreCommandConfig } from "../types/commands";

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
    return context.diagnostics.flatMap((diagnostic) =>
      this.createCommandCodeAction(document, range, diagnostic)
    );
  }

  private createCommandCodeAction(
    document: vscode.TextDocument,
    range: vscode.Range | vscode.Selection,
    diagnostic: vscode.Diagnostic
  ): vscode.CodeAction[] {
    const value = document.getText(range);

    const actions = [
      new vscode.CodeAction(
        `ignore value ${value}`,
        vscode.CodeActionKind.QuickFix
      ),
      new vscode.CodeAction(
        `ignore rule ${diagnostic.code}`,
        vscode.CodeActionKind.QuickFix
      ),
      new vscode.CodeAction(
        `ignore path ${document.uri.fsPath}`,
        vscode.CodeActionKind.QuickFix
      ),
    ];

    actions[0].command = {
      command: VscodeCommands.IgnoreCommandId,
      title: `Ignore value: ${value}`,
      tooltip: "This will always ignore this value",
      arguments: [
        {
          ignoreBy: CommandParameters.ByValue,
          param: value,
          document: document,
        } as IgnoreCommandConfig,
      ],
    };
    actions[0].diagnostics = [diagnostic];
    actions[0].isPreferred = true;

    actions[1].command = {
      command: VscodeCommands.IgnoreCommandId,
      title: `Ignore rule ID: ${diagnostic.code}`,
      tooltip: "This will always ignore this rule type",
      arguments: [
        {
          ignoreBy: CommandParameters.ByRule,
          param: diagnostic.code,
          document: document,
        } as IgnoreCommandConfig,
      ],
    };
    actions[1].diagnostics = [diagnostic];
    actions[1].isPreferred = false;

    actions[2].command = {
      command: VscodeCommands.IgnoreCommandId,
      title: `Ignore path: ${document.uri.fsPath}`,
      tooltip: "This will always ignore this path",
      arguments: [
        {
          ignoreBy: CommandParameters.ByPath,
          param: document.uri.fsPath,
          document: document,
        } as IgnoreCommandConfig,
      ],
    };
    actions[2].diagnostics = [diagnostic];
    actions[2].isPreferred = false;

    return actions;
  }
}
