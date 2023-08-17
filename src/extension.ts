// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from "vscode";
import { extensionOutput } from "./logging/extension-output";
import { secretScan } from "./services/scanner";
import { auth } from "./services/auth";
import { install } from "./services/install";
import { uninstall } from "./services/uninstall";
import {
  extensionName,
  extensionId,
  scanOnSaveProperty,
  scaScanOnOpenProperty,
} from "./utils/texts";
import { VscodeCommands } from "./utils/commands";
import statusBar from "./utils/status-bar";
import extensionContext, { setContext } from './utils/context';
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
import { TreeView } from "./providers/tree-view/types";
import { TreeViewDataProvider } from "./providers/tree-view/provider";
import { TreeViewItem } from "./providers/tree-view/item";
import { scaScan } from "./services/scaScanner";
import { SCA_CONFIGURATION_SCAN_SUPPORTED_FILES } from './constants';


export async function activate(context: vscode.ExtensionContext) {
  extensionOutput.info("Cycode extension is now active");

  extensionContext.initContext(context);
  const outputChannel = vscode.window.createOutputChannel(extensionName);
  extensionOutput.setOpts({ output: outputChannel });
  extensionOutput.info("Cycode plugin is running");

  const diagnosticCollection =
    vscode.languages.createDiagnosticCollection(extensionName);

  const isAuthed = extensionContext.getGlobalState("auth.isAuthed");
  extensionContext.setContext("auth.isAuthed", !!isAuthed);

  const treeView = createTreeView(context);

  const commands = initCommands(
    context,
    diagnosticCollection,
    treeView
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

      // if the file name is related SCA file, run SCA scan
      if (
        SCA_CONFIGURATION_SCAN_SUPPORTED_FILES.some(fileSuffix => document.fileName.endsWith(fileSuffix))
      ) {
        scaScan(
          context,
          {
            config,
            workspaceFolderPath:
              vscode.workspace.getWorkspaceFolder(document.uri)?.uri.fsPath ||
              "",
            diagnosticCollection,
          },
          treeView,
        );
      }

      // run secrets scan on any file. CLI will exclude irrelevant files
      const workspaceFolderPath =
        vscode.workspace.workspaceFolders?.[0]?.uri.fsPath || "";
      secretScan(
        context,
        { config, workspaceFolderPath, diagnosticCollection },
        treeView,
        document.fileName
      );
    }
  });

  context.subscriptions.push(newStatusBar, ...commands, scanOnSave);

  if (isDebugMode()) {
    return;
  }

  // FIXME(MarshalX): call only after successful auth check!
  _runScaScanOnProjectOpen(context, diagnosticCollection, treeView);
}

function createTreeView(
  context: vscode.ExtensionContext
): TreeView {
  const provider = new TreeViewDataProvider();
  const view = vscode.window.createTreeView(TreeViewItem.viewType, {
    treeDataProvider: provider,
    canSelectMany: true,
  });

  context.subscriptions.push(
    vscode.window.registerTreeDataProvider(
      TreeViewItem.viewType,
      provider
    )
  );
  return { view, provider };
}

const _runScaScanOnProjectOpen = async (
  context: vscode.ExtensionContext,
  diagnosticCollection: vscode.DiagnosticCollection,
  treeView: TreeView
) => {
  const scaScanOnOpen = vscode.workspace.getConfiguration(extensionId).get(scaScanOnOpenProperty);
  if (!scaScanOnOpen) {
    return;
  }

  // sca scan
  if (validateConfig()) {
    return;
  }
  const workspaceFolderPath =
    vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;

  // we should run sca scan only if the project is open!
  if (!workspaceFolderPath) {
    return;
  }

  scaScan(context, {
    config,
    workspaceFolderPath,
    diagnosticCollection,
  }, treeView);
};

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
  treeView: TreeView
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
      await secretScan(context, params, treeView);
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

  const openMainMenuCommand = vscode.commands.registerCommand(
    VscodeCommands.OpenMainMenuCommandId,
    async () => {
      setContext("treeView.isShowed", false);
    }
  );

  const scaScanCommand = vscode.commands.registerCommand(
    VscodeCommands.ScaScanCommandId,
    async () => {
      if (validateConfig()) {
        return;
      }

      // iterate over workspace folders and scan each one
      for (const workspaceFolder of vscode.workspace.workspaceFolders || []) {
        const params = {
          config,
          workspaceFolderPath: workspaceFolder.uri.fsPath,
          diagnosticCollection,
        };
        await scaScan(context, params, treeView);
      }
    }
  );

  return [
    scanCommand,
    scaScanCommand,
    authCommand,
    authCheckCommand,
    installCommand,
    uninstallCommand,
    openSettingsCommand,
    openMainMenuCommand,
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

const isDebugMode = () => process.env.VSCODE_DEBUG_MODE === "true";
