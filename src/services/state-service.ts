import * as vscode from 'vscode';
import { inject, singleton } from 'tsyringe';
import { LoggerServiceSymbol } from '../symbols';
import { ILoggerService } from './logger-service';
import { GlobalKeyValueStorage, LocalKeyValueStorage } from './key-value-storage-service';

export class GlobalExtensionState {
  public EnvVsCode = true;
  public CliInstalled = false;
  public CliAuthed = false;
  public CliVer: string | null = null;
  public CliHash: string | null = null;
  public CliDirHashes: Record<string, string> | null = null;
  public CliLastUpdateCheckedAt: number | null = null;
  public IsAiLargeLanguageModelEnabled = false;
}
export type GlobalExtensionStateKey = keyof GlobalExtensionState;

// eslint-disable-next-line @typescript-eslint/no-extraneous-class
export class LocalExtensionState {
  // add local state here
}
export type LocalExtensionStateKey = keyof LocalExtensionState;

const _GLOBAL_STATE_KEY = 'cycode:globalState';
const _LOCAL_STATE_KEY = 'cycode:localState';

enum VscodeStates {
  IsVsCodeEnv = 'env.isVsCode',
  IsAuthorized = 'auth.isAuthed',
  IsInstalled = 'cli.isInstalled',
}

const _CONTEXT_EXPORTED_GLOBAL_STATE_KEYS: Record<string, string> = {
  // map global state keys to vscode context keys
  EnvVsCode: VscodeStates.IsVsCodeEnv,
  CliAuthed: VscodeStates.IsAuthorized,
  CliInstalled: VscodeStates.IsInstalled,
};

const _CONTEXT_EXPORTED_LOCAL_STATE_KEYS: Record<string, string> = {
  // map local state keys to vscode context keys
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
  private localStorage = new LocalKeyValueStorage();
  private globalStorage = new GlobalKeyValueStorage();

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
    this.localStorage.initContext(context);
    this.globalStorage.initContext(context);

    // reset the state to the default values on every extension initialization
    this.saveLocalState();
  }

  setContext(key: string, value: unknown): void {
    this.logger?.debug(`Setting context: ${key} = ${value}`);
    vscode.commands.executeCommand('setContext', `cycode:${key}`, value);
  }

  private loadGlobalState(): GlobalExtensionState {
    const globalStateJson = this.globalStorage.get<string>(_GLOBAL_STATE_KEY);
    const globalState = globalStateJson ? JSON.parse(globalStateJson) : undefined;
    if (globalState === undefined) {
      this.logger?.debug('Global state does not exist, creating new state');
      this.saveGlobalState();
    } else {
      this.mergeGlobalState(globalState);
      this.exportGlobalStateToContext();
    }

    this.logger?.debug('Load global state');
    return this._globalState;
  }

  private loadLocalState(): LocalExtensionState {
    const localStateJson = this.localStorage.get<string>(_LOCAL_STATE_KEY);
    const localState = localStateJson ? JSON.parse(localStateJson) : undefined;
    if (localState === undefined) {
      this.logger?.debug('Local state does not exist, creating new state');
      this.saveLocalState();
    } else {
      this.mergeLocalState(localState);
      this.exportLocalStateToContext();
    }

    this.logger?.debug('Load local state');
    return this._localState;
  }

  load(): void {
    this.loadGlobalState();
    this.loadLocalState();
  }

  private saveGlobalState(): void {
    const globalStateJson = JSON.stringify(this._globalState);
    this.globalStorage.set(_GLOBAL_STATE_KEY, globalStateJson);
    this.exportGlobalStateToContext();
    this.logger?.debug('Save global state');
  }

  private saveLocalState(): void {
    const localStateJson = JSON.stringify(this._localState);
    this.localStorage.set(_LOCAL_STATE_KEY, localStateJson);
    this.exportLocalStateToContext();
    this.logger?.debug('Save local state');
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
    if (extensionState.EnvVsCode !== undefined) (this._globalState.EnvVsCode = extensionState.EnvVsCode);
    if (extensionState.CliInstalled !== undefined) (this._globalState.CliInstalled = extensionState.CliInstalled);
    if (extensionState.CliAuthed !== undefined) (this._globalState.CliAuthed = extensionState.CliAuthed);
    if (extensionState.CliVer !== undefined) (this._globalState.CliVer = extensionState.CliVer);
    if (extensionState.CliHash !== undefined) (this._globalState.CliHash = extensionState.CliHash);
    if (extensionState.CliDirHashes !== undefined) (this._globalState.CliDirHashes = extensionState.CliDirHashes);
    if (extensionState.CliLastUpdateCheckedAt !== undefined) (
      this._globalState.CliLastUpdateCheckedAt = extensionState.CliLastUpdateCheckedAt
    );
    if (extensionState.IsAiLargeLanguageModelEnabled !== undefined) (
      this._globalState.IsAiLargeLanguageModelEnabled = extensionState.IsAiLargeLanguageModelEnabled
    );
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  private mergeLocalState(_extensionState: LocalExtensionState): void {
    // merge local state here
  }
}
