import * as vscode from 'vscode';

// A module to handle vscode extension context global state
let extensionContext: vscode.ExtensionContext | null = null;

export const setContext = (key: string, value: any) => {
  vscode.commands.executeCommand('setContext', `cycode:${key}`, value);
};

export const initContext = (context: vscode.ExtensionContext) => {
  extensionContext = context;
};

export const getContext = (): vscode.ExtensionContext => {
  if (!extensionContext) {
    throw new Error('Extension context is not initialized');
  }
  return extensionContext;
};

export const getWorkspaceState = (key: string): unknown => {
  return getContext().workspaceState.get(key);
};

export const updateWorkspaceState = (key: string, value: unknown) => {
  return getContext().workspaceState.update(key, value);
};

const module = {
  initContext,
  setContext,
  getWorkspaceState,
  updateWorkspaceState,
};

export default module;
