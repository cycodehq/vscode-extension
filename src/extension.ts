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
import { isSupportedPackageFile } from './constants';


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

  await initExtension(context, diagnosticCollection, treeView);

  initActivityBar(context);

  const codeLens =
    vscode.languages.registerCodeLensProvider(
      {scheme: 'file', language: '*'},
      new CodelensProvider()
    );

  const quickActions = vscode.languages.registerCodeActionsProvider(
    {scheme: 'file', language: '*'},
    new CycodeActions(),
    {
      providedCodeActionKinds: [vscode.CodeActionKind.QuickFix],
    }
  );

  const scanOnSave = vscode.workspace.onDidSaveTextDocument((document) => {
    const scanOnSaveEnabled = vscode.workspace.getConfiguration(extensionId).get(scanOnSaveProperty);
    if (!scanOnSaveEnabled) {
      return;
    }

    if (validateConfig()) {
      return;
    }

    const fileFsPath = document.uri.fsPath;
    if (!fileFsPath) {
      return;
    }

    const workspaceFolderPath = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;

    if (isSupportedPackageFile(document.fileName)) {
      scaScan(
        context,
        {
          config,
          pathToScan: fileFsPath,
          workspaceFolderPath,
          diagnosticCollection,
        },
        treeView,
      );
    }

    // run Secrets scan on any saved file. CLI will exclude irrelevant files
    secretScan(
      context,
      {
        config,
        documentToScan: document,
        workspaceFolderPath: workspaceFolderPath,
        diagnosticCollection
      },
      treeView,
    );
  });

  // add all disposables to correctly dispose them on extension deactivating
  context.subscriptions.push(newStatusBar,  ...commands, codeLens, quickActions, scanOnSave);
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
    pathToScan: workspaceFolderPath,
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
      // scan the current open document if opened

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

      await secretScan(
        context,
        {
          config,
          documentToScan: vscode.window.activeTextEditor.document,
          workspaceFolderPath: vscode.workspace.workspaceFolders?.[0]?.uri.fsPath,
          diagnosticCollection,
        },
        treeView
      );
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

  const openViolationInFileCommand = vscode.commands.registerCommand(
    VscodeCommands.OpenViolationInFile,
    async (fullFilePath: string, lineNumber: number) => {
      const vscodeLineNumber = lineNumber - 1;
      const uri = vscode.Uri.file(fullFilePath);
      vscode.window.showTextDocument(uri, {selection: new vscode.Range(vscodeLineNumber, 0, vscodeLineNumber, 0)});
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
        workspaceFolderPath: vscode.workspace.workspaceFolders?.[0]?.uri.fsPath,
      };
      await install(context, params);
    }
  );

  const uninstallCommand = vscode.commands.registerCommand(
    VscodeCommands.UninstallCommandId,
    async () => {
      const params = {
        config,
        workspaceFolderPath: vscode.workspace.workspaceFolders?.[0]?.uri.fsPath,
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

      await ignore(context, {
        documentInitiatedIgnore: ignoreConfig.document,
        config,
        workspaceFolderPath: vscode.workspace.workspaceFolders?.[0]?.uri.fsPath,
        ignoreConfig,
        diagnosticCollection,
        treeView,
      });
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
      // FIXME(MarshalX): do we actually want to scan all the workspace folders?
      //  why not only active one?
      //  why it waits each scan result?
      //  it take too long
      for (const workspaceFolder of vscode.workspace.workspaceFolders || []) {
        await scaScan(
          context,
          {
            config,
            pathToScan: workspaceFolder.uri.fsPath,
            workspaceFolderPath: workspaceFolder.uri.fsPath,
            diagnosticCollection,
          },
          treeView
        );
      }
    }
  );

  return [
    scanCommand,
    scaScanCommand,
    authCommand,
    authCheckCommand,
    openViolationInFileCommand,
    installCommand,
    uninstallCommand,
    openSettingsCommand,
    openMainMenuCommand,
    ignoreCommand,
  ];
}

const initExtension = async (
  context: vscode.ExtensionContext,
  diagnosticCollection: vscode.DiagnosticCollection,
  treeView: TreeView
): Promise<void> => {
  try {
    const workspaceFolderPath = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath || '';
    await checkCLI(context, {workspaceFolderPath, config});

    const isAuthenticated = await authCheck(config);
    if (isAuthenticated) {
      // don't wait until the scan completes to not block the extension init
      _runScaScanOnProjectOpen(context, diagnosticCollection, treeView);
    }
  } catch (error) {
    extensionOutput.error("Cycode CLI is not installed");
  }
};

// This method is called when your extension is deactivated
export function deactivate() {}

const isDebugMode = () => process.env.VSCODE_DEBUG_MODE === "true";
