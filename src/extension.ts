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
import { authCheck } from "./services/auth_check";
import { HardcodedSecretsTree } from "./providers/tree-data-providers/types";
import { HardcodedSecretsTreeDataProvider } from "./providers/tree-data-providers/hardcoded-secrets-provider";
import { HardcodedSecretsTreeItem } from "./providers/tree-data-providers/hardcoded-secrets-item";

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

  const hardCodedSecretsTree = createHardcodedSecretsTree(context);

  const commands = initCommands(
    context,
    diagnosticCollection,
    hardCodedSecretsTree
  );
  const newStatusBar = statusBar.create();

  if (!isAuthed) {
    statusBar.showAuthIsRequired();
  }

  initExtension(context);

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
        hardCodedSecretsTree,
        document.fileName
      );
    }
  });

  context.subscriptions.push(newStatusBar, ...commands, scanOnSave);
}

function createHardcodedSecretsTree(
  context: vscode.ExtensionContext
): HardcodedSecretsTree {
  const provider = new HardcodedSecretsTreeDataProvider([]);
  const view = vscode.window.createTreeView(HardcodedSecretsTreeItem.viewType, {
    treeDataProvider: provider,
    canSelectMany: true,
  });

  context.subscriptions.push(
    vscode.window.registerTreeDataProvider(
      HardcodedSecretsTreeItem.viewType,
      provider
    )
  );
  return { view, provider };
}

function initActivityBar(context: vscode.ExtensionContext): void {
  const scanView = vscode.window.registerWebviewViewProvider(
    ScanView.viewType,
    new ScanView()
  );

  const authenticatingView = vscode.window.registerWebviewViewProvider(
    AuthenticatingView.viewType,
    new AuthenticatingView()
  );

  const loginView = vscode.window.registerWebviewViewProvider(
    LoginView.viewType,
    new LoginView()
  );

  context.subscriptions.push(scanView, authenticatingView, loginView);
}

function initCommands(
  context: vscode.ExtensionContext,
  diagnosticCollection: vscode.DiagnosticCollection,
  hardcodedSecretsTree: HardcodedSecretsTree
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
      await scan(context, params, hardcodedSecretsTree);
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

      await auth(params);
    }
  );

  const authCheckCommand = vscode.commands.registerCommand(
    VscodeCommands.AuthCheck,
    async () => {
      if (validateConfig()) {
        return;
      }

      await authCheck(config);
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
    VscodeCommands.OpenSettingsCommandId,
    async () => {
      vscode.commands.executeCommand("workbench.action.openSettings", "cycode");
    }
  );

  return [
    scanCommand,
    authCommand,
    authCheckCommand,
    installCommand,
    uninstallCommand,
    openSettingsCommand,
    ignoreCommand,
  ];
}

function initExtension(context: vscode.ExtensionContext): void {
  checkCLI(context, {
    workspaceFolderPath:
      vscode.workspace.workspaceFolders?.[0]?.uri.fsPath || "",
    config,
  }).then(() => authCheck(config))
    .catch(() => extensionOutput.error("Cycode CLI is not installed"));
}

// This method is called when your extension is deactivated
export function deactivate() {}
