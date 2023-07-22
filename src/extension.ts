// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from "vscode";
import { extensionOutput } from "./logging/extension-output";
import { scan } from "./services/scanner";
import { auth } from "./services/auth";
import { install } from "./services/install";
import { uninstall } from "./services/uninstall";
import { extensionName, extensionId, scanOnSaveProperty } from "./utils/texts";
import { VscodeCommands } from "./utils/commands";
import statusBar from "./utils/status-bar";
import extensionContext from "./utils/context";
import { checkCLI } from "./services/checkCli";
import { config, validateConfig } from "./utils/config";
import TrayNotifications from "./utils/TrayNotifications";
import { IgnoreCommandConfig } from "./types/commands";
import { ignore } from "./services/ignore";
import { CycodeActions } from "./providers/CodeActions";
import { CodelensProvider } from "./providers/CodelensProvider";
import ScanView from "./views/scan/scan-view";
import LoginView from "./views/login/login-view";
import AuthenticatingView from "./views/authenticating/authenticating-view";
import * as path from "path";
import * as fs from "fs";

export function activate(context: vscode.ExtensionContext) {
  extensionOutput.info("Cycode extension is now active");

  extensionContext.initContext(context);
  const outputChannel = vscode.window.createOutputChannel(extensionName);
  extensionOutput.setOpts({ output: outputChannel });
  extensionOutput.info("Cycode plugin is running");

  const diagnosticCollection =
    vscode.languages.createDiagnosticCollection(extensionName);

  const isAuthed = extensionContext.getGlobalState("auth.isAuthed");
  extensionContext.setContext("auth.isAuthed", !!isAuthed);
  const commands = initCommands(context, diagnosticCollection);
  const newStatusBar = statusBar.create();

  if (!isAuthed) {
    statusBar.showAuthIsRequired();
  }

  checkCLI(context, {
    workspaceFolderPath:
      vscode.workspace.workspaceFolders?.[0]?.uri.fsPath || "",
    config,
  });

  const scanOnSave = vscode.workspace.onDidSaveTextDocument((document) => {
    if (
      vscode.workspace.getConfiguration(extensionId).get(scanOnSaveProperty)
    ) {
      if (validateConfig()) {
        return;
      }

      const workspaceFolderPath =
        vscode.workspace.workspaceFolders?.[0]?.uri.fsPath || "";
      scan(
        context,
        { config, workspaceFolderPath, diagnosticCollection },
        document.fileName
      );
    }
  });

  initActivityBar(context);

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

function initActivityBar(context: vscode.ExtensionContext): void {
  const { extensionUri } = context;
  const scanView = vscode.window.registerWebviewViewProvider(
    ScanView.viewType,
    new ScanView(extensionUri)
  );

  const authenticatingView = vscode.window.registerWebviewViewProvider(
    AuthenticatingView.viewType,
    new AuthenticatingView(extensionUri)
  );

  const loginView = vscode.window.registerWebviewViewProvider(
    LoginView.viewType,
    new LoginView(extensionUri)
  );

  context.subscriptions.push(...[scanView, authenticatingView, loginView]);
}

function initCommands(
  context: vscode.ExtensionContext,
  diagnosticCollection: vscode.DiagnosticCollection
) {
  const scanCommand = vscode.commands.registerCommand(
    VscodeCommands.ScanCommandId,
    async () => {
      if (
        !vscode.window.activeTextEditor?.document ||
        vscode.window?.activeTextEditor?.document?.uri.scheme === "output"
      ) {
        TrayNotifications.showMustBeFocusedOnFile();

        return;
      }

      if (validateConfig()) {
        return;
      }

      const params = {
        config,
        workspaceFolderPath:
          vscode.workspace.workspaceFolders?.[0]?.uri.fsPath || "",
        diagnosticCollection,
      };
      await scan(context, params);
    }
  );
  const authCommand = vscode.commands.registerCommand(
    VscodeCommands.AuthCommandId,
    async () => {
      if (validateConfig()) {
        return;
      }

      const params = {
        config,
        workspaceFolderPath:
          vscode.workspace.workspaceFolders?.[0]?.uri.fsPath || "",
      };

      await auth(context, params);
    }
  );

  const installCommand = vscode.commands.registerCommand(
    VscodeCommands.InstallCommandId,
    async () => {
      if (validateConfig()) {
        return;
      }

      const params = {
        config,
        workspaceFolderPath:
          vscode.workspace.workspaceFolders?.[0]?.uri.fsPath || "",
      };
      await install(context, params);
    }
  );

  const uninstallCommand = vscode.commands.registerCommand(
    VscodeCommands.UninstallCommandId,
    async () => {
      const params = {
        config,
        workspaceFolderPath:
          vscode.workspace.workspaceFolders?.[0]?.uri.fsPath || "",
      };

      // TODO:: find which workspace folder is the file in
      await uninstall(context, params);
    }
  );

  const ignoreCommand = vscode.commands.registerCommand(
    VscodeCommands.IgnoreCommandId,
    async (ignoreConfig: IgnoreCommandConfig) => {
      if (validateConfig()) {
        return;
      }

      // TODO:: find which workspace folder is the file in
      const params = {
        config,
        workspaceFolderPath:
          vscode.workspace.workspaceFolders?.[0]?.uri.fsPath || "",
        ignoreConfig,
        diagnosticCollection,
      };

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
