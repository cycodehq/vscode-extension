import * as vscode from 'vscode';
import {inject, singleton} from 'tsyringe';
import {LoggerServiceSymbol} from '../symbols';
import {ILoggerService} from './logger-service';
import {VscodeStates} from '../utils/states';

export class GlobalExtensionState {
  public CliInstalled: boolean = false;
  public CliAuthed: boolean = false;
  public CliVer: string | null = null;
  public CliHash: string | null = null;
  public CliDirHashes: Record<string, string> | null = null;
  public CliLastUpdateCheckedAt: number | null = null;
}
export type GlobalExtensionStateKey = keyof GlobalExtensionState;

export class LocalExtensionState {
  public AuthenticatingInProgress: boolean = false;

  public SecretsScanInProgress: boolean = false;
  public ScaScanInProgress: boolean = false;
  public IacScanInProgress: boolean = false;
  public SastScanInProgress: boolean = false;

  public NotificationIsOpen: boolean = false;
  public NotificationWasShown: boolean = false;

  public HasDetections: boolean = false;

  public TreeViewIsOpen: boolean = false;
}
export type LocalExtensionStateKey = keyof LocalExtensionState;

const _GLOBAL_STATE_KEY = 'cycode:globalState';
const _LOCAL_STATE_KEY = 'cycode:localState';

const _CONTEXT_EXPORTED_GLOBAL_STATE_KEYS: Record<string, string> = {
  // map global state keys to vscode context keys
  'CliAuthed': VscodeStates.IsAuthorized,
};

const _CONTEXT_EXPORTED_LOCAL_STATE_KEYS: Record<string, string> = {
  // map local state keys to vscode context keys
  'AuthenticatingInProgress': VscodeStates.AuthenticatingInProgress,
  'SecretsScanInProgress': VscodeStates.SecretsScanInProgress,
  'ScaScanInProgress': VscodeStates.ScaScanInProgress,
  'IacScanInProgress': VscodeStates.IacScanInProgress,
  'SastScanInProgress': VscodeStates.SastScanInProgress,
  'NotificationIsOpen': VscodeStates.NotificationIsOpen,
  'NotificationWasShown': VscodeStates.NotificationWasShown,
  'HasDetections': VscodeStates.HasDetections,
  'TreeViewIsOpen': VscodeStates.TreeViewIsOpen,
};

export interface IStateService {
  globalState: GlobalExtensionState;
  localState: LocalExtensionState;

  initContext(context: vscode.ExtensionContext): void;

  load(): void;
  save(): void;
}

@singleton()
export class StateService implements IStateService {
  private readonly _globalState: GlobalExtensionState;
  private readonly _localState: LocalExtensionState;
  private _extensionContext?: vscode.ExtensionContext;

  constructor(@inject(LoggerServiceSymbol) private logger?: ILoggerService) {
    this._globalState = new GlobalExtensionState();
    this._localState = new LocalExtensionState();
  }

  get globalState(): GlobalExtensionState {
    return this._globalState;
  }

  get localState(): LocalExtensionState {
    return this._localState;
  }

  initContext(context: vscode.ExtensionContext): void {
    this._extensionContext = context;

    // reset the state to the default values on every extension initialization
    this.saveLocalState();
  }

  setContext(key: string, value: unknown): void {
    this.logger?.debug(`Setting context: ${key} = ${value}`);
    vscode.commands.executeCommand('setContext', `cycode:${key}`, value);
  }

  private getGlobalState<T>(key: string): T | undefined {
    return this._extensionContext?.globalState.get(key);
  }

  private updateGlobalState(key: string, value: unknown): void {
    this._extensionContext?.globalState.update(key, value);
  }

  private getLocalState<T>(key: string): T | undefined {
    return this._extensionContext?.workspaceState.get(key);
  }

  private updateLocalState(key: string, value: unknown): void {
    this._extensionContext?.workspaceState.update(key, value);
  }

  private loadGlobalState(): GlobalExtensionState {
    const globalStateJson = this.getGlobalState<string>(_GLOBAL_STATE_KEY);
    const globalState = globalStateJson ? JSON.parse(globalStateJson) : undefined;
    if (globalState === undefined) {
      this.logger?.debug('Global state does not exist, creating new state');
      this.saveGlobalState();
    } else {
      this.mergeGlobalState(globalState);
      this.exportGlobalStateToContext();
    }

    this.logger?.debug(`Loaded global state: ${globalStateJson}`);
    return this._globalState;
  }

  private loadLocalState(): LocalExtensionState {
    const localStateJson = this.getLocalState<string>(_LOCAL_STATE_KEY);
    const localState = localStateJson ? JSON.parse(localStateJson) : undefined;
    if (localState === undefined) {
      this.logger?.debug('Local state does not exist, creating new state');
      this.saveLocalState();
    } else {
      this.mergeLocalState(localState);
      this.exportLocalStateToContext();
    }

    this.logger?.debug(`Loaded local state: ${localStateJson}`);
    return this._localState;
  }

  load(): void {
    this.loadGlobalState();
    this.loadLocalState();
  }

  private saveGlobalState(): void {
    const globalStateJson = JSON.stringify(this._globalState);
    this.updateGlobalState(_GLOBAL_STATE_KEY, globalStateJson);
    this.exportGlobalStateToContext();
    this.logger?.debug(`Saved global state: ${globalStateJson}`);
  }

  private saveLocalState(): void {
    const localStateJson = JSON.stringify(this._localState);
    this.updateLocalState(_LOCAL_STATE_KEY, localStateJson);
    this.exportLocalStateToContext();
    this.logger?.debug(`Saved local state: ${localStateJson}`);
  }

  save(): void {
    this.saveGlobalState();
    this.saveLocalState();
  }

  private exportGlobalStateToContext(): void {
    for (const [stateKey, contextKey] of Object.entries(_CONTEXT_EXPORTED_GLOBAL_STATE_KEYS)) {
      this.setContext(contextKey, this._globalState[stateKey as GlobalExtensionStateKey]);
    }
  }

  private exportLocalStateToContext(): void {
    for (const [stateKey, contextKey] of Object.entries(_CONTEXT_EXPORTED_LOCAL_STATE_KEYS)) {
      this.setContext(contextKey, this._localState[stateKey as LocalExtensionStateKey]);
    }
  }

  private mergeGlobalState(extensionState: GlobalExtensionState): void {
    extensionState.CliInstalled !== undefined && (this._globalState.CliInstalled = extensionState.CliInstalled);
    extensionState.CliAuthed !== undefined && (this._globalState.CliAuthed = extensionState.CliAuthed);
    extensionState.CliVer !== undefined && (this._globalState.CliVer = extensionState.CliVer);
    extensionState.CliHash !== undefined && (this._globalState.CliHash = extensionState.CliHash);
    extensionState.CliDirHashes !== undefined && (this._globalState.CliDirHashes = extensionState.CliDirHashes);
    extensionState.CliLastUpdateCheckedAt !== undefined && (
      this._globalState.CliLastUpdateCheckedAt = extensionState.CliLastUpdateCheckedAt
    );
  }

  private mergeLocalState(extensionState: LocalExtensionState): void {
    extensionState.AuthenticatingInProgress !== undefined && (
      this._localState.AuthenticatingInProgress = extensionState.AuthenticatingInProgress
    );
    extensionState.SecretsScanInProgress !== undefined && (
      this._localState.SecretsScanInProgress = extensionState.SecretsScanInProgress
    );
    extensionState.ScaScanInProgress !== undefined && (
      this._localState.ScaScanInProgress = extensionState.ScaScanInProgress
    );
    extensionState.IacScanInProgress !== undefined && (
      this._localState.IacScanInProgress = extensionState.IacScanInProgress
    );
    extensionState.SastScanInProgress !== undefined && (
      this._localState.SastScanInProgress = extensionState.SastScanInProgress
    );
    extensionState.NotificationIsOpen !== undefined && (
      this._localState.NotificationIsOpen = extensionState.NotificationIsOpen
    );
    extensionState.NotificationWasShown !== undefined && (
      this._localState.NotificationWasShown = extensionState.NotificationWasShown
    );
    extensionState.HasDetections !== undefined && (
      this._localState.HasDetections = extensionState.HasDetections
    );
    extensionState.TreeViewIsOpen !== undefined && (
      this._localState.TreeViewIsOpen = extensionState.TreeViewIsOpen
    );
  }
}
