import TrayNotifications from "../TrayNotifications";
import { setContext, updateGlobalState } from "../context";
import statusBar from "../status-bar";

export function updateAuthState(isAuthorized: boolean): void {
  statusBar.showDefault();
  TrayNotifications.showAuthSuccess();

  // Hide the authenticate button
  setContext("auth.isAuthed", isAuthorized);
  updateGlobalState("auth.isAuthed", isAuthorized);
}

export function startAuthenticationProcess(): void {
  setContext("auth.isAuthenticating", true);
}

export function endAuthenticationProcess(): void {
  setContext("auth.isAuthenticating", false);
}

export function onAuthFailure(): void {
  statusBar.showAuthError();
  TrayNotifications.showAuthFailed();

  updateAuthState(false);
}
