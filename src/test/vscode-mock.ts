/*
 * minimal replacement of the "vscode" module for unit tests.
 * it is installed by setup.ts, so the extension code can be imported outside VS Code.
 * tests change "settings" and "workspace.isTrusted" to control the behavior
 */

export const settings: Record<string, unknown> = {};

const disposable = { dispose: () => undefined };

export const workspace = {
  isTrusted: true,
  getConfiguration: () => ({ get: (key: string) => settings[key] }),
  onDidSaveTextDocument: () => disposable,
};

const createStatusBarItem = () => ({
  text: '',
  command: undefined as string | undefined,
  backgroundColor: undefined as unknown,
  show: () => undefined,
  hide: () => undefined,
  dispose: () => undefined,
});

export const window = {
  activeColorTheme: { kind: 2 },
  createStatusBarItem,
  // runs the task straight away, with a progress and a cancellation token that never fire
  withProgress: <T>(
    _options: unknown,
    task: (progress: { report: (value: unknown) => void }, token: unknown) => Promise<T>,
  ): Promise<T> => {
    const token = { isCancellationRequested: false, onCancellationRequested: () => disposable };
    return task({ report: () => undefined }, token);
  },
  onDidChangeActiveColorTheme: () => disposable,
  showErrorMessage: () => Promise.resolve(undefined),
  showInformationMessage: () => Promise.resolve(undefined),
};

export const commands = {
  executeCommand: () => Promise.resolve(undefined),
};

export const extensions = {
  getExtension: () => undefined,
};

export const ProgressLocation = { SourceControl: 1, Window: 10, Notification: 15 };

export const StatusBarAlignment = { Left: 1, Right: 2 };

export class ThemeColor {
  constructor(public readonly id: string) {}
}

export const ColorThemeKind = { Light: 1, Dark: 2, HighContrast: 3, HighContrastLight: 4 };

export const version = '1.66.0';

export const resetVscodeMock = () => {
  for (const key of Object.keys(settings)) {
    // eslint-disable-next-line @typescript-eslint/no-dynamic-delete
    delete settings[key];
  }

  workspace.isTrusted = true;
};
