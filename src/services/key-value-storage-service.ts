import * as vscode from 'vscode';

export interface IKeyValueStorage {
  initContext(context: vscode.ExtensionContext): void;
  get<T>(key: string): T | undefined;
  set(key: string, value: unknown): void;
}

export class GlobalKeyValueStorage implements IKeyValueStorage {
  private _extensionContext?: vscode.ExtensionContext;

  public initContext(context: vscode.ExtensionContext): void {
    this._extensionContext = context;
  }

  public get<T>(key: string): T | undefined {
    return this._extensionContext?.globalState.get(key);
  }

  public set(key: string, value: unknown): void {
    this._extensionContext?.globalState.update(key, value);
  }
}

export class LocalKeyValueStorage implements IKeyValueStorage {
  private _extensionContext?: vscode.ExtensionContext;

  public initContext(context: vscode.ExtensionContext): void {
    this._extensionContext = context;
  }

  public get<T>(key: string): T | undefined {
    return this._extensionContext?.workspaceState.get(key);
  }

  public set(key: string, value: unknown): void {
    this._extensionContext?.workspaceState.update(key, value);
  }
}
