import TrayNotifications from "../TrayNotifications";
import { setContext, updateGlobalState } from "../context";
import statusBar from "../status-bar";

export function updateAuthState(isAuthorized: boolean) {
  statusBar.showDefault();
  TrayNotifications.showAuthSuccess();

  // Hide the authenticate button
  setContext("auth.isAuthed", isAuthorized);
  updateGlobalState("auth.isAuthed", isAuthorized);
}

export function startAuthenticationProcess() {
  setContext("auth.isAuthenticating", true);
}

export function endAuthenticationProcess() {
  setContext("auth.isAuthenticating", false);
}
