import * as vscode from 'vscode';
import MainView from './main/main-view';
import AuthenticatingView from './authenticating/authenticating-view';
import LoginView from './login/login-view';

export const registerActivityBar = (context: vscode.ExtensionContext): void => {
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
};
