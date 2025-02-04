import * as vscode from 'vscode';
import ScanView from './scan/scan-view';
import LoadingView from './loading/loading-view';
import AuthView from './auth/auth-view';

export class ActivityBar {
  public ScanView: ScanView;
  public LoadingView: LoadingView;
  public AuthView: AuthView;

  constructor() {
    this.ScanView = new ScanView();
    this.LoadingView = new LoadingView();
    this.AuthView = new AuthView();
  }
}

export const registerActivityBar = (context: vscode.ExtensionContext): ActivityBar => {
  const activityBar = new ActivityBar();

  const registerOptions = {
    webviewOptions: {
      // we want to be able to update unconfused UI views; for example, to update supported modules
      retainContextWhenHidden: true,
    },
  };

  const scanView = vscode.window.registerWebviewViewProvider(
    ScanView.viewType,
    activityBar.ScanView,
    registerOptions,
  );

  const loadingView = vscode.window.registerWebviewViewProvider(
    LoadingView.viewType,
    activityBar.LoadingView,
    registerOptions,
  );

  const authView = vscode.window.registerWebviewViewProvider(
    AuthView.viewType,
    activityBar.AuthView,
    registerOptions,
  );

  context.subscriptions.push(scanView, loadingView, authView);

  return activityBar;
};
