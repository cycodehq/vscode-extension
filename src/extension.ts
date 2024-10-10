// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import 'reflect-metadata';
import './ioc';
import * as vscode from 'vscode';
import {extensionName} from './utils/texts';
import statusBar from './utils/status-bar';
import {captureException, initSentry} from './sentry';
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
import {IExtensionService} from './services/extension-service';
import {OnProjectOpen} from './listeners/on-project-open';
import {createTreeView} from './providers/tree-data';
import {registerCommands} from './commands';
import {registerOnDidSaveTextDocument} from './listeners/on-did-save-text-document';
import {registerActivityBar} from './ui/views/activity-bar';
import {registerCodeLensProvider} from './providers/codelens-provider';
import {registerCodeActionsProvider} from './providers/code-action';
import {registerOnDidChangeActiveTextEditor} from './listeners/on-did-change-active-text-editor';
import {showCliInstallFailed} from './utils/tray-notifications';

export async function activate(context: vscode.ExtensionContext) {
  initSentry();

  const logger = container.resolve<ILoggerService>(LoggerServiceSymbol);
  logger.initLogger();
  logger.info('Cycode extension is now active');

  const stateService = container.resolve<IStateService>(StateServiceSymbol);
  stateService.initContext(context);
  stateService.load();

  const scanResultsService = container.resolve<IScanResultsService>(ScanResultsServiceSymbol);
  scanResultsService.initContext(context);
  scanResultsService.dropAllScanResults();

  logger.info('Cycode plugin is running');

  const diagnosticCollection = vscode.languages.createDiagnosticCollection(extensionName);
  const treeView = createTreeView(context);

  const extension = container.resolve<IExtensionService>(ExtensionServiceSymbol);
  extension.extensionContext = context;
  extension.diagnosticCollection = diagnosticCollection;
  extension.treeView = treeView;

  // refactor this to porper class
  const extensionStatusBar = statusBar.create();
  context.subscriptions.push(extensionStatusBar);
  // end refactor

  if (!stateService.globalState.CliAuthed) {
    statusBar.showAuthIsRequired();
  }

  registerCommands(context);
  registerActivityBar(context);
  registerCodeLensProvider(context);
  registerCodeActionsProvider(context);
  registerOnDidSaveTextDocument(context);
  registerOnDidChangeActiveTextEditor(context);

  try {
    const cycode = container.resolve<ICycodeService>(CycodeServiceSymbol);
    await cycode.installCliIfNeededAndCheckAuthentication();
  } catch (error) {
    captureException(error);
    logger.error(`Cycode CLI is not installed: ${error}`);
    showCliInstallFailed();
  }

  OnProjectOpen();
}

// This method is called when your extension is deactivated
// eslint-disable-next-line @typescript-eslint/no-empty-function
export function deactivate() {}
