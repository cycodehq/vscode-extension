import TrayNotifications from '../TrayNotifications';
import statusBar from '../status-bar';
import {container} from 'tsyringe';
import {IStateService} from '../../services/StateService';
import {StateServiceSymbol} from '../../symbols';

export function startAuthenticationProcess(): void {
  const stateService = container.resolve<IStateService>(StateServiceSymbol);
  stateService.localState.AuthenticatingInProgress = true;
  stateService.save();
}

export function endAuthenticationProcess(): void {
  const stateService = container.resolve<IStateService>(StateServiceSymbol);
  stateService.localState.AuthenticatingInProgress = false;
  stateService.save();
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
  const stateService = container.resolve<IStateService>(StateServiceSymbol);
  stateService.globalState.CliAuthed = isAuthorized;
  stateService.save();
}
