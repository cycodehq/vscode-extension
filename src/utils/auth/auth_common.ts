import TrayNotifications from "../TrayNotifications";
import { setContext, updateGlobalState } from "../context";
import statusBar from "../status-bar";

export function startAuthenticationProcess(): void {
  setContext("auth.isAuthenticating", true);
}

export function endAuthenticationProcess(): void {
  setContext("auth.isAuthenticating", false);
}

export function onAuthFailure(): void {
  showAuthFailureNotification();
  updateAuthState(false);
}

export function onAuthSuccess(): void {
  showAuthSuccessNotification();
  updateAuthState(true);
}

function showAuthFailureNotification(): void {
  statusBar.showAuthError();
  TrayNotifications.showAuthFailed();
}

function showAuthSuccessNotification(): void {
  statusBar.showDefault();
  TrayNotifications.showAuthSuccess();
}

function updateAuthState(isAuthorized: boolean): void {
  // Hide the authenticate button
  setContext("auth.isAuthed", isAuthorized);
  updateGlobalState("auth.isAuthed", isAuthorized);
}
