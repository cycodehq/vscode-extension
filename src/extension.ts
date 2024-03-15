// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';
import {extensionOutput} from './logging/extension-output';
import {secretScan} from './services/secretScanner';
import {auth} from './services/auth';
import {install} from './services/install';
import {uninstall} from './services/uninstall';
import {
  extensionName,
  extensionId,
  scanOnSaveProperty,
} from './utils/texts';
import {VscodeCommands} from './utils/commands';
import statusBar from './utils/status-bar';
import extensionContext, {setContext} from './utils/context';
import {checkCLI} from './services/checkCli';
import {config, validateConfig} from './utils/config';
import TrayNotifications from './utils/TrayNotifications';
import {IgnoreCommandConfig} from './types/commands';
import {ignore} from './services/ignore';
import {CycodeActions} from './providers/code-actions/CodeActions';
import {CodelensProvider} from './providers/CodelensProvider';
import ScanView from './views/scan/scan-view';
import LoginView from './views/login/login-view';
import AuthenticatingView from './views/authenticating/authenticating-view';
import {authCheck} from './services/auth_check';
import {TreeView, TreeViewDisplayedData} from './providers/tree-view/types';
import {TreeViewDataProvider} from './providers/tree-view/provider';
import {TreeViewItem} from './providers/tree-view/item';
import {scaScan} from './services/scaScanner';
import {isSupportedPackageFile, ScanType} from './constants';
import {createPanel} from './panels/violation/violation-panel';
import {AnyDetection} from './types/detection';
import {VscodeStates} from './utils/states';


export async function activate(context: vscode.ExtensionContext) {
  extensionOutput.info('Cycode extension is now active');

  extensionContext.initContext(context);
  const outputChannel = vscode.window.createOutputChannel(extensionName);
  extensionOutput.setOpts({output: outputChannel});
  extensionOutput.info('Cycode plugin is running');

  const diagnosticCollection =
    vscode.languages.createDiagnosticCollection(extensionName);

  // FIXME(MarshalX): works well on vscode open,
  //  but doesn't work when open another detection without closing the restored panel
  //  don't forget to register in context.subscriptions when will be fixed
  //  register "onWebviewPanel:detectionDetails" in activationEvents
  // const detectionDetainsPanel = vscode.window.registerWebviewPanelSerializer(
  //   'detectionDetails', new DetectionDetailsSerializer()
  // );

  const isAuthed = extensionContext.getGlobalState(VscodeStates.IsAuthorized);
  extensionContext.setContext(VscodeStates.IsAuthorized, !!isAuthed);

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

  await initExtension(diagnosticCollection, treeView);

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
        {
          config,
          pathToScan: document.fileName,
          workspaceFolderPath: workspaceFolderPath,
          diagnosticCollection,
        },
        treeView,
    );
  });

  // add all disposables to correctly dispose them on extension deactivating
  context.subscriptions.push(newStatusBar, ...commands, codeLens, quickActions, scanOnSave);
}

// FIXME (MarshalX): uncomment when will want to restore state after restart
// class DetectionDetailsSerializer implements vscode.WebviewPanelSerializer {
//   async deserializeWebviewPanel(webviewPanel: vscode.WebviewPanel, _: any) {
//     // restore panel on vscode restart
//     restoreWebViewPanel(webviewPanel);
//   }
// }

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
  return {view, provider};
}

const _runScaScanOnProjectOpen = (
    diagnosticCollection: vscode.DiagnosticCollection,
    treeView: TreeView
) => {
  const scaScanOnOpen = false;
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

  scaScan({
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
  const secretScanCommand = vscode.commands.registerCommand(
      VscodeCommands.SecretScanCommandId,
      () => {
      // scan the current open document if opened

        if (
          !vscode.window.activeTextEditor?.document ||
        vscode.window?.activeTextEditor?.document?.uri.scheme === 'output'
        ) {
          TrayNotifications.showMustBeFocusedOnFile();

          return;
        }

        if (validateConfig()) {
          return;
        }

        secretScan(
            {
              config,
              pathToScan: vscode.window.activeTextEditor.document.fileName,
              workspaceFolderPath: vscode.workspace.workspaceFolders?.[0]?.uri.fsPath,
              diagnosticCollection,
              onDemand: true,
            },
            treeView
        );
      }
  );

  const secretScanForCurrentProjectCommand = vscode.commands.registerCommand(
      VscodeCommands.SecretScanForProjectCommandId,
      () => {
        if (validateConfig()) {
          return;
        }

        const projectPath = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
        if (!projectPath) {
          return;
        }

        secretScan(
            {
              config,
              pathToScan: projectPath,
              workspaceFolderPath: projectPath,
              diagnosticCollection,
              onDemand: true,
            },
            treeView
        );
      }
  );

  const authCommand = vscode.commands.registerCommand(
      VscodeCommands.AuthCommandId,
      () => {
        if (validateConfig()) {
          return;
        }

        const params = {
          config,
          workspaceFolderPath:
          vscode.workspace.workspaceFolders?.[0]?.uri.fsPath || '',
        };

        auth(params);
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

  const onTreeItemClickCommand = vscode.commands.registerCommand(
      VscodeCommands.OnTreeItemClick,
      async (fullFilePath: string, violation: TreeViewDisplayedData) => {
        await vscode.commands.executeCommand(VscodeCommands.OpenViolationInFile, fullFilePath, violation.lineNumber);
        vscode.commands.executeCommand(VscodeCommands.OpenViolationPanel, violation.detectionType, violation.detection);
      }
  );

  const onOpenViolationInFileFromTreeItemContextMenuCommand = vscode.commands.registerCommand(
      VscodeCommands.OpenViolationInFileFromTreeItemContextMenu,
      (item: TreeViewItem) => {
        vscode.commands.executeCommand(
            VscodeCommands.OpenViolationInFile,
            item.fullFilePath,
            item.vulnerability?.lineNumber
        );
      }
  );

  const onOpenViolationPanelFromTreeItemContextMenuCommand = vscode.commands.registerCommand(
      VscodeCommands.OpenViolationPanelFromTreeItemContextMenu,
      (item: TreeViewItem) => {
        vscode.commands.executeCommand(
            VscodeCommands.OpenViolationPanel,
            item.vulnerability?.detectionType,
            item.vulnerability?.detection)
        ;
      }
  );

  const openViolationInFileCommand = vscode.commands.registerCommand(
      VscodeCommands.OpenViolationInFile,
      async (fullFilePath: string, lineNumber: number) => {
        const vscodeLineNumber = lineNumber - 1;
        const uri = vscode.Uri.file(fullFilePath);
        await vscode.window.showTextDocument(uri, {
          viewColumn: vscode.ViewColumn.One,
          selection: new vscode.Range(vscodeLineNumber, 0, vscodeLineNumber, 0),
        });
      }
  );

  const openViolationPanel = vscode.commands.registerCommand(
      VscodeCommands.OpenViolationPanel,
      (detectionType: ScanType, detection: AnyDetection) => {
        if (detectionType === ScanType.Sca) {
          createPanel(context, detectionType, detection);
        }
      }
  );

  const installCommand = vscode.commands.registerCommand(
      VscodeCommands.InstallCommandId,
      () => {
        if (validateConfig()) {
          return;
        }

        const params = {
          config,
          workspaceFolderPath: vscode.workspace.workspaceFolders?.[0]?.uri.fsPath,
        };
        install(params);
      }
  );

  const uninstallCommand = vscode.commands.registerCommand(
      VscodeCommands.UninstallCommandId,
      () => {
        const params = {
          config,
          workspaceFolderPath: vscode.workspace.workspaceFolders?.[0]?.uri.fsPath,
        };

        // TODO:: find which workspace folder is the file in
        uninstall(params);
      }
  );

  const ignoreCommand = vscode.commands.registerCommand(
      VscodeCommands.IgnoreCommandId,
      async (ignoreConfig: IgnoreCommandConfig) => {
        if (validateConfig()) {
          return;
        }

        await ignore({
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
      () => {
        vscode.commands.executeCommand('workbench.action.openSettings', 'cycode');
      }
  );

  const openMainMenuCommand = vscode.commands.registerCommand(
      VscodeCommands.OpenMainMenuCommandId,
      () => {
        setContext(VscodeStates.TreeViewIsOpen, false);
      }
  );

  const scaScanCommand = vscode.commands.registerCommand(
      VscodeCommands.ScaScanCommandId,
      () => {
        if (validateConfig()) {
          return;
        }

        // iterate over workspace folders and scan each one
        // FIXME(MarshalX): do we actually want to scan all the workspace folders?
        //  why not only active one?
        //  why it waits each scan result?
        //  it take too long
        for (const workspaceFolder of vscode.workspace.workspaceFolders || []) {
          scaScan(
              {
                config,
                pathToScan: workspaceFolder.uri.fsPath,
                workspaceFolderPath: workspaceFolder.uri.fsPath,
                diagnosticCollection,
                onDemand: true,
              },
              treeView
          );
        }
      }
  );

  return [
    secretScanCommand,
    secretScanForCurrentProjectCommand,
    scaScanCommand,
    authCommand,
    authCheckCommand,
    onTreeItemClickCommand,
    onOpenViolationInFileFromTreeItemContextMenuCommand,
    onOpenViolationPanelFromTreeItemContextMenuCommand,
    openViolationInFileCommand,
    openViolationPanel,
    installCommand,
    uninstallCommand,
    openSettingsCommand,
    openMainMenuCommand,
    ignoreCommand,
  ];
}

const initExtension = async (
    diagnosticCollection: vscode.DiagnosticCollection,
    treeView: TreeView
): Promise<void> => {
  try {
    const workspaceFolderPath = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath || '';
    await checkCLI({workspaceFolderPath, config});

    const isAuthenticated = await authCheck(config);
    if (isAuthenticated) {
      // don't wait until the scan completes to not block the extension init
      _runScaScanOnProjectOpen(diagnosticCollection, treeView);
    }
  } catch (error) {
    extensionOutput.error('Cycode CLI is not installed');
  }
};

// This method is called when your extension is deactivated
// eslint-disable-next-line @typescript-eslint/no-empty-function
export function deactivate() {}

