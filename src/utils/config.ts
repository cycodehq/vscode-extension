import * as vscode from 'vscode';
import {
  experimentalSastSupportProperty,
  experimentalScaSyncFlowProperty,
  extensionId,
  publisherId,
  scanOnSaveProperty,
} from './texts';
import {showSettingsError} from './TrayNotifications';
import {getDefaultCliPath} from '../constants';
import * as fs from 'fs';

export const config = {
  get cliPath(): string {
    const value = vscode.workspace
        .getConfiguration(extensionId)
        .get<string>('cliPath');
    return value || getDefaultCliPath();
  },
  get cliAutoManaged(): boolean {
    const value = vscode.workspace
        .getConfiguration(extensionId)
        .get<boolean>('cliAutoManaged');
    return value === undefined ? true : value; // enabled by default
  },
  get cliEnv(): { [key: string]: string } {
    const CYCODE_API_URL = vscode.workspace
        .getConfiguration(extensionId)
        .get('apiUrl') as string;

    const CYCODE_APP_URL = vscode.workspace
        .getConfiguration(extensionId)
        .get('appUrl') as string;

    const env = {CYCODE_API_URL, CYCODE_APP_URL};

    // Remove entries with empty values
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    return Object.fromEntries(Object.entries(env).filter(([_, v]) => !!v));
  },
  get additionalParams(): string[] {
    const additionalParams = vscode.workspace
        .getConfiguration(extensionId)
        .get('additionalParameters') as string;

    return additionalParams ? additionalParams.split(' ') : [];
  },
  get agentName(): string {
    return 'vscode_extension';
  },
  get agentVersion(): string {
    return vscode.extensions.getExtension(`${publisherId}.${extensionId}`)
        ?.packageJSON.version;
  },
  get envName(): string {
    return 'vscode';
  },
  get envVersion(): string {
    return vscode.version;
  },
  get scanOnSaveEnabled(): boolean {
    const value = vscode.workspace
        .getConfiguration(extensionId)
        .get<boolean>(scanOnSaveProperty);
    return value === undefined ? false : value;
  },
  get experimentalScaSyncFlow(): boolean {
    const value = vscode.workspace
        .getConfiguration(extensionId)
        .get<boolean>(experimentalScaSyncFlowProperty);
    return value === undefined ? false : value;
  },
  get experimentalSastSupport(): boolean {
    const value = vscode.workspace
        .getConfiguration(extensionId)
        .get<boolean>(experimentalSastSupportProperty);
    return value === undefined ? false : value;
  },
};

export const validateConfig = () => {
  const validateURL = (url: string) => {
    if (!url) {
      return null;
    }

    if (!url.startsWith('https')) {
      const message = `URLs must start with https: ${url}`;
      showSettingsError(message);

      return message;
    }

    if (url.endsWith('/')) {
      const message = `URLs must not end with '/': ${url}`;
      showSettingsError(message);

      return message;
    }

    try {
      new URL(url);
    } catch (e) {
      const message = `Invalid URL in settings: ${url}`;
      showSettingsError(message);
      return message;
    }
  };

  const validateCliPath = (cliPath: string) => {
    if (!cliPath) {
      return null;
    }

    if (!fs.existsSync(cliPath)) {
      const message = `CLI path does not exist: ${cliPath}`;
      showSettingsError(message);
      return message;
    }

    if (!fs.statSync(cliPath).isFile()) {
      // TODO(MarshalX): validate +x permission?
      const message = `CLI path is not a file: ${cliPath}`;
      showSettingsError(message);
      return message;
    }
  };

  const cliEnv = config.cliEnv;

  if (
    validateURL(cliEnv.CYCODE_API_URL) ||
    validateURL(cliEnv.CYCODE_APP_URL) ||
    validateCliPath(config.cliPath)
  ) {
    return true;
  }
};
