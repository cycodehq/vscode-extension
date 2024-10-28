import * as vscode from 'vscode';
import ScanView from './scan/scan-view';
import LoadingView from './loading/loading-view';
import AuthView from './auth/auth-view';

export const registerActivityBar = (context: vscode.ExtensionContext): void => {
  const scanView = vscode.window.registerWebviewViewProvider(
    ScanView.viewType,
    new ScanView(),
  );

  const loadingView = vscode.window.registerWebviewViewProvider(
    LoadingView.viewType,
    new LoadingView(),
  );

  const authView = vscode.window.registerWebviewViewProvider(
    AuthView.viewType,
    new AuthView(),
  );

  context.subscriptions.push(scanView, loadingView, authView);
};
