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

export const window = {
  activeColorTheme: { kind: 2 },
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

export const ColorThemeKind = { Light: 1, Dark: 2, HighContrast: 3, HighContrastLight: 4 };

export const version = '1.66.0';

export const resetVscodeMock = () => {
  for (const key of Object.keys(settings)) {
    // eslint-disable-next-line @typescript-eslint/no-dynamic-delete
    delete settings[key];
  }

  workspace.isTrusted = true;
};
