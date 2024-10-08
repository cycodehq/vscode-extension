// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import 'reflect-metadata';
import './ioc';
import * as vscode from 'vscode';
import {extensionName} from './utils/texts';
import statusBar from './utils/status-bar';
import extensionContext from './utils/context';
import {CycodeActions} from './providers/code-actions/code-actions';
import {CodelensProvider} from './providers/codelens-provider';
import MainView from './views/main/main-view';
import LoginView from './views/login/login-view';
import AuthenticatingView from './views/authenticating/authenticating-view';
import {captureException, initSentry} from './sentry';
import {refreshDiagnosticCollectionData} from './services/diagnostics/common';
import {container} from 'tsyringe';
import {ICycodeService} from './services/cycode-service';
import {
  CycodeServiceSymbol,
  ExtensionServiceSymbol,
  LoggerServiceSymbol,
  ScanResultsServiceSymbol,
  StateServiceSymbol,
} from './symbols';
import {IStateService} from './services/state-service';
import {ILoggerService} from './services/logger-service';
import {IScanResultsService} from './services/scan-results-service';
import {OnDidSaveTextDocument} from './listeners/on-did-save-text-document';
import {IExtensionService} from './services/extension-service';
import {OnProjectOpen} from './listeners/on-project-open';
import {createTreeView} from './providers/tree-view';
import {registerCommands} from './commands';

export async function activate(context: vscode.ExtensionContext) {
  initSentry();

  const extension = container.resolve<IExtensionService>(ExtensionServiceSymbol);

  const logger = container.resolve<ILoggerService>(LoggerServiceSymbol);
  logger.initLogger();
  logger.info('Cycode extension is now active');

  const stateService = container.resolve<IStateService>(StateServiceSymbol);
  stateService.initContext(context);
  stateService.load();

  extensionContext.initContext(context); // remove after refactor

  const scanResultsService = container.resolve<IScanResultsService>(ScanResultsServiceSymbol);
  scanResultsService.dropAllScanResults();

  logger.info('Cycode plugin is running');

  const diagnosticCollection =
      vscode.languages.createDiagnosticCollection(extensionName);
  const updateDiagnosticsOnChanges = vscode.window.onDidChangeActiveTextEditor((editor) => {
    if (editor) {
      // TODO(MarshalX): refresh only for editor.document if we will need better performance
      refreshDiagnosticCollectionData(diagnosticCollection);
    }
  });

  const isAuthed = stateService.globalState.CliAuthed;
  const treeView = createTreeView(context);

  extension.extensionContext = context;
  extension.diagnosticCollection = diagnosticCollection;
  extension.treeView = treeView;

  registerCommands(context);
  const extensionStatusBar = statusBar.create();

  if (!isAuthed) {
    statusBar.showAuthIsRequired();
  }

  await initExtension();

  initActivityBar(context);

  const codeLens = vscode.languages.registerCodeLensProvider(
      {scheme: 'file', language: '*'},
      new CodelensProvider()
  );

  const quickActions = vscode.languages.registerCodeActionsProvider(
      {scheme: 'file', language: '*'},
      new CycodeActions(),
      {providedCodeActionKinds: [vscode.CodeActionKind.QuickFix]}
  );

  const scanOnSave = vscode.workspace.onDidSaveTextDocument(OnDidSaveTextDocument);

  // add all disposables to correctly dispose them on extension deactivating
  context.subscriptions.push(
      extensionStatusBar, codeLens, quickActions, scanOnSave, updateDiagnosticsOnChanges
  );
}

function initActivityBar(context: vscode.ExtensionContext): void {
  const scanView = vscode.window.registerWebviewViewProvider(
      MainView.viewType,
      new MainView()
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

const initExtension = async (): Promise<void> => {
  const logger = container.resolve<ILoggerService>(LoggerServiceSymbol);
  const stateService = container.resolve<IStateService>(StateServiceSymbol);

  try {
    const cycode = container.resolve<ICycodeService>(CycodeServiceSymbol);
    await cycode.installCliIfNeededAndCheckAuthentication();

    if (stateService.globalState.CliAuthed) {
      // don't wait until the scan completes to not block the extension init
      OnProjectOpen();
    }
  } catch (error) {
    captureException(error);
    logger.error(`Cycode CLI is not installed: ${error}`,);
    vscode.window.showErrorMessage('Cycode CLI is not installed or not available');
  }
};

// This method is called when your extension is deactivated
// eslint-disable-next-line @typescript-eslint/no-empty-function
export function deactivate() {}
