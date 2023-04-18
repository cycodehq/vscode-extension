// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from "vscode";
import { extensionOutput } from "./logging/extension-output";
import { scan } from "./services/scanner";
import { auth } from "./services/auth";
import { install } from "./services/install";
import { uninstall } from "./services/uninstall";
import {
  extensionName,
  extensionId,
  scanOnSavePropery as scanOnSaveProperty,
} from "./utils/texts";
import { VscodeCommands } from "./utils/commands";
import statusBar from "./utils/status-bar";
import extenstionContext from "./utils/context";
import { checkCLI } from "./services/checkCli";
import { CycodeActions } from "./providers/CodeActions";
import { ignore } from "./services/ignore";
import { CodelensProvider } from "./providers/CodelensProvider";

export function activate(context: vscode.ExtensionContext) {
  console.log("Cycode extension is now active");

  const outputChannel = vscode.window.createOutputChannel(extensionName);
  extensionOutput.setOpts({ output: outputChannel });
  extensionOutput.info("Cycode plugin is running");

  const diagnosticCollection =
    vscode.languages.createDiagnosticCollection(extensionName);

  const newStatusBar = statusBar.create();

  extenstionContext.initContext(context);
  extenstionContext.updateGlobalState("scan.isScanning", false); // reset just in case
  const isAuthed = extenstionContext.getGlobalState("auth.isAuthed");

  extenstionContext.setContext("auth.isAuthed", !!isAuthed);
  const commands = initCommands(context, diagnosticCollection);

  checkCLI(context);

  const scanOnSave = vscode.workspace.onDidSaveTextDocument((document) => {
    if (
      vscode.workspace.getConfiguration(extensionId).get(scanOnSaveProperty)
    ) {
      scan(context, diagnosticCollection, document.fileName);
    }
  });

  context.subscriptions.push(
    vscode.languages.registerCodeActionsProvider(
      { scheme: "file", language: "*" },
      new CycodeActions(),
      {
        providedCodeActionKinds: [vscode.CodeActionKind.QuickFix],
      }
    )
  );

  vscode.languages.registerCodeLensProvider(
    { scheme: "file", language: "*" },
    new CodelensProvider()
  );

  context.subscriptions.push(newStatusBar, ...commands, scanOnSave);
}

function initCommands(
  context: vscode.ExtensionContext,
  diagnosticCollection: vscode.DiagnosticCollection
) {
  const scanCommand = vscode.commands.registerCommand(
    VscodeCommands.ScanCommandId,
    async () => {
      await scan(context, diagnosticCollection);
    }
  );
  const authCommand = vscode.commands.registerCommand(
    VscodeCommands.AuthCommandId,
    async () => {
      await auth(context);
    }
  );

  const installCommand = vscode.commands.registerCommand(
    VscodeCommands.InstallCommandId,
    async () => {
      await install(context);
    }
  );

  const uninstallCommand = vscode.commands.registerCommand(
    VscodeCommands.UninstallCommandId,
    async () => {
      await uninstall(context);
    }
  );

  const ignoreCommand = vscode.commands.registerCommand(
    VscodeCommands.IgnoreCommandId,
    async (params) => {
      await ignore(context, params);
    }
  );

  const openSettingsCommand = vscode.commands.registerCommand(
    VscodeCommands.openSettingsCommandId,
    async () => {
      vscode.commands.executeCommand("workbench.action.openSettings", "cycode");
    }
  );

  return [
    scanCommand,
    authCommand,
    installCommand,
    uninstallCommand,
    openSettingsCommand,
    ignoreCommand,
  ];
}

// This method is called when your extension is deactivated
export function deactivate() {}
