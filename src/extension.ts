// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from "vscode";
import { extensionOutput } from "./logging/extension-output";
import { scan } from "./services/scanner";
import { auth } from "./services/auth";
import { Texts } from "./utils/texts";
import { Commands } from "./utils/commands";
import statusBar from "./utils/status-bar";

export function activate(context: vscode.ExtensionContext) {
  console.log("Cycode extension is now active");

  const outputChannel = vscode.window.createOutputChannel(Texts.ExtensionName);
  extensionOutput.setOpts({ output: outputChannel });
  extensionOutput.info("Cycode plugin is running");

  const diagnosticCollection = vscode.languages.createDiagnosticCollection(
    Texts.ExtensionName
  );

  const newStatusBar = statusBar.create();

  const scanCommand = vscode.commands.registerCommand(
    Commands.ScanCommandId,
    async () => {
      await scan(context, diagnosticCollection);
    }
  );
  const authCommand = vscode.commands.registerCommand(
    Commands.AuthCommandId,
    async () => {
      await auth(context);
    }
  );
  newStatusBar.command = Commands.ScanCommandId;
  context.subscriptions.push(newStatusBar);
  context.subscriptions.push(scanCommand);
  context.subscriptions.push(authCommand);

  let disposable = vscode.workspace.onDidSaveTextDocument((document) => {
    if (
      vscode.workspace
        .getConfiguration(Texts.ExtensionName.toLocaleLowerCase())
        .get("scanOnSave")
    ) {
      scan(context, diagnosticCollection, document.fileName);
    }
  });
  context.subscriptions.push(disposable);
}

// This method is called when your extension is deactivated
export function deactivate() {}
