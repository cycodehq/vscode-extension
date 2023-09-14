import * as vscode from 'vscode';
import {VscodeStates} from './states';

// A module to handle vscode extension context global state
let extensionContext: vscode.ExtensionContext | null = null;

export const setContext = (key: string, value: any) => {
  vscode.commands.executeCommand('setContext', `cycode:${key}`, value);
};

export const initContext = (context: vscode.ExtensionContext) => {
  extensionContext = context;

  // Reset states
  updateWorkspaceState(VscodeStates.SecretsScanInProgress, false);
  updateWorkspaceState(VscodeStates.ScaScanInProgress, false);
  updateWorkspaceState(VscodeStates.NotificationIsOpen, false);
  updateWorkspaceState(VscodeStates.NotificationWasShown, false);
};

export const getContext = (): vscode.ExtensionContext => {
  if (!extensionContext) {
    throw new Error('Extension context is not initialized');
  }
  return extensionContext;
};

export const getGlobalState = (key: string): unknown => {
  return getContext().globalState.get(key);
};

export const updateGlobalState = (key: string, value: unknown) => {
  return getContext().globalState.update(key, value);
};

export const getWorkspaceState = (key: string): unknown => {
  return getContext().workspaceState.get(key);
};

export const updateWorkspaceState = (key: string, value: unknown) => {
  return getContext().workspaceState.update(key, value);
};

const module = {
  get extensionContext() {
    return getContext();
  },
  initContext,
  setContext,
  getGlobalState,
  updateGlobalState,
  getWorkspaceState,
  updateWorkspaceState,
};

export default module;
