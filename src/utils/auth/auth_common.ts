import TrayNotifications from '../TrayNotifications';
import {getGlobalState, setContext, updateGlobalState} from '../context';
import statusBar from '../status-bar';
import {VscodeStates} from '../states';

export function startAuthenticationProcess(): void {
  setContext(VscodeStates.AuthenticatingInProgress, true);
}

export function endAuthenticationProcess(): void {
  setContext(VscodeStates.AuthenticatingInProgress, false);
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

export function updateAuthState(isAuthorized: boolean): void {
  // Hide the "authenticate" button
  setContext(VscodeStates.IsAuthorized, isAuthorized);
  updateGlobalState(VscodeStates.IsAuthorized, isAuthorized);
}

export function getAuthState(): boolean {
  const value = getGlobalState<boolean>(VscodeStates.IsAuthorized);
  return value === undefined ? false : value;
}
