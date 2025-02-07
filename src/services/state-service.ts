import * as vscode from 'vscode';
import { inject, singleton } from 'tsyringe';
import { LoggerServiceSymbol } from '../symbols';
import { ILoggerService } from './logger-service';
import { GlobalKeyValueStorage, LocalKeyValueStorage } from './key-value-storage-service';
import { StatusResult } from '../cli/models/status-result';
import { ActivityBar } from '../ui/views/activity-bar';

export class GlobalExtensionState {
  public EnvVsCode = true;
  public CliVer: string | null = null;
  public CliHash: string | null = null;
  public CliDirHashes: Record<string, string> | null = null;
  public CliLastUpdateCheckedAt: number | null = null;
}
export type GlobalExtensionStateKey = keyof GlobalExtensionState;

// eslint-disable-next-line @typescript-eslint/no-extraneous-class
export class LocalExtensionState {
  // add local state here
}
export type LocalExtensionStateKey = keyof LocalExtensionState;

export class TemporaryExtensionState {
  private _cliStatus: StatusResult | null = null;

  public CliInstalled = false;
  public CliAuthed = false;

  public ActivityBar: ActivityBar | null = null;

  public IsTreeViewFilterByCriticalSeverityEnabled = false;
  public IsTreeViewFilterByHighSeverityEnabled = false;
  public IsTreeViewFilterByMediumSeverityEnabled = false;
  public IsTreeViewFilterByLowSeverityEnabled = false;
  public IsTreeViewFilterByInfoSeverityEnabled = false;

  public get CliStatus(): StatusResult | null {
    return this._cliStatus;
  }

  public set CliStatus(value: StatusResult | null) {
    this._cliStatus = value;

    if (this.ActivityBar && value?.supportedModules) {
      this.ActivityBar.ScanView.postSupportedModules(value.supportedModules);
    }
  }

  public get IsSecretScanningEnabled(): boolean {
    return this.CliStatus?.supportedModules?.secretScanning === true;
  }

  public get IsScaScanningEnabled(): boolean {
    return this.CliStatus?.supportedModules?.scaScanning === true;
  }

  public get IsIacScanningEnabled(): boolean {
    return this.CliStatus?.supportedModules?.iacScanning === true;
  }

  public get IsSastScanningEnabled(): boolean {
    return this.CliStatus?.supportedModules?.sastScanning === true;
  }

  public get IsAiLargeLanguageModelEnabled(): boolean {
    return this.CliStatus?.supportedModules?.aiLargeLanguageModel === true;
  }
}

export type TempExtensionStateKey = keyof TemporaryExtensionState;

const _GLOBAL_STATE_KEY = 'cycode:globalState';
const _LOCAL_STATE_KEY = 'cycode:localState';

enum VscodeStates {
  IsVsCodeEnv = 'env.isVsCode',
  IsAuthorized = 'auth.isAuthed',
  IsInstalled = 'cli.isInstalled',
  // modules:
  IsSecretScanningEnabled = 'modules.isSecretScanningEnabled',
  IsScaScanningEnabled = 'modules.isScaScanningEnabled',
  IsIacScanningEnabled = 'modules.isIacScanningEnabled',
  IsSastScanningEnabled = 'modules.isSastScanningEnabled',
  IsAiLargeLanguageModelEnabled = 'modules.isAiLargeLanguageModelEnabled',
  // tree view severity filter:
  IsTreeViewFilterByCriticalSeverityEnabled = 'filter.severity.isCriticalEnabled',
  IsTreeViewFilterByHighSeverityEnabled = 'filter.severity.isHighEnabled',
  IsTreeViewFilterByMediumSeverityEnabled = 'filter.severity.isMediumEnabled',
  IsTreeViewFilterByLowSeverityEnabled = 'filter.severity.isLowEnabled',
  IsTreeViewFilterByInfoSeverityEnabled = 'filter.severity.isInfoEnabled',
}

const _CONTEXT_EXPORTED_GLOBAL_STATE_KEYS: Record<string, string> = {
  // map global state keys to vscode context keys
  EnvVsCode: VscodeStates.IsVsCodeEnv,
};

const _CONTEXT_EXPORTED_LOCAL_STATE_KEYS: Record<string, string> = {
  // map local state keys to vscode context keys
};

const _CONTEXT_EXPORTED_TEMP_STATE_KEYS: Record<string, string> = {
  // map temp state keys to vscode context keys
  CliAuthed: VscodeStates.IsAuthorized,
  CliInstalled: VscodeStates.IsInstalled,
  // modules:
  IsSecretScanningEnabled: VscodeStates.IsSecretScanningEnabled,
  IsScaScanningEnabled: VscodeStates.IsScaScanningEnabled,
  IsIacScanningEnabled: VscodeStates.IsIacScanningEnabled,
  IsSastScanningEnabled: VscodeStates.IsSastScanningEnabled,
  IsAiLargeLanguageModelEnabled: VscodeStates.IsAiLargeLanguageModelEnabled,
  // tree view severity filter:
  IsTreeViewFilterByCriticalSeverityEnabled: VscodeStates.IsTreeViewFilterByCriticalSeverityEnabled,
  IsTreeViewFilterByHighSeverityEnabled: VscodeStates.IsTreeViewFilterByHighSeverityEnabled,
  IsTreeViewFilterByMediumSeverityEnabled: VscodeStates.IsTreeViewFilterByMediumSeverityEnabled,
  IsTreeViewFilterByLowSeverityEnabled: VscodeStates.IsTreeViewFilterByLowSeverityEnabled,
  IsTreeViewFilterByInfoSeverityEnabled: VscodeStates.IsTreeViewFilterByInfoSeverityEnabled,
};

export interface IStateService {
  globalState: GlobalExtensionState;
  localState: LocalExtensionState;
  tempState: TemporaryExtensionState;

  initContext(context: vscode.ExtensionContext): void;

  load(): void;
  save(): void;
}

@singleton()
export class StateService implements IStateService {
  private readonly _globalState: GlobalExtensionState;
  private readonly _localState: LocalExtensionState;
  private readonly _temporaryState: TemporaryExtensionState;
  private localStorage = new LocalKeyValueStorage();
  private globalStorage = new GlobalKeyValueStorage();

  constructor(@inject(LoggerServiceSymbol) private logger?: ILoggerService) {
    this._globalState = new GlobalExtensionState();
    this._localState = new LocalExtensionState();
    this._temporaryState = new TemporaryExtensionState();
  }

  get globalState(): GlobalExtensionState {
    return this._globalState;
  }

  get localState(): LocalExtensionState {
    return this._localState;
  }

  get tempState(): TemporaryExtensionState {
    return this._temporaryState;
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

    /*
     * reset the state to the default values on every extension initialization
     */
    this.saveGlobalState();
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

  private saveTempState(): void {
    this.exportTempStateToContext();
    this.logger?.debug('Save temp state');
  }

  save(): void {
    this.saveGlobalState();
    this.saveLocalState();
    this.saveTempState();
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

  private exportTempStateToContext(): void {
    for (const [stateKey, contextKey] of Object.entries(_CONTEXT_EXPORTED_TEMP_STATE_KEYS)) {
      this.setContext(contextKey, this._temporaryState[stateKey as TempExtensionStateKey]);
    }
  }

  private mergeGlobalState(extensionState: GlobalExtensionState): void {
    if (extensionState.EnvVsCode !== undefined) (this._globalState.EnvVsCode = extensionState.EnvVsCode);
    if (extensionState.CliVer !== undefined) (this._globalState.CliVer = extensionState.CliVer);
    if (extensionState.CliHash !== undefined) (this._globalState.CliHash = extensionState.CliHash);
    if (extensionState.CliDirHashes !== undefined) (this._globalState.CliDirHashes = extensionState.CliDirHashes);
    if (extensionState.CliLastUpdateCheckedAt !== undefined) (
      this._globalState.CliLastUpdateCheckedAt = extensionState.CliLastUpdateCheckedAt
    );
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  private mergeLocalState(_extensionState: LocalExtensionState): void {
    // merge local state here
  }
}
