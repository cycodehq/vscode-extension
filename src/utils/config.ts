import * as vscode from 'vscode';
import {extensionId, publisherId} from './texts';
import {showSettingsError} from './TrayNotifications';

export const config = {
  get cliPath() {
    return (
      (vscode.workspace
          .getConfiguration(extensionId)
          .get('cliPath') as string) || 'cycode'
    );
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
  get additionalParams() {
    const additionalParams = vscode.workspace
        .getConfiguration(extensionId)
        .get('additionalParameters') as string;

    return additionalParams ? additionalParams.split(' ') : [];
  },
  get agentName() {
    return 'vscode_extension';
  },
  get agentVersion() {
    return vscode.extensions.getExtension(`${publisherId}.${extensionId}`)
        ?.packageJSON.version;
  },
  get envName() {
    return 'vscode';
  },
  get envVersion() {
    return vscode.version;
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

  const cliEnv = config.cliEnv;

  if (
    validateURL(cliEnv.CYCODE_API_URL) ||
    validateURL(cliEnv.CYCODE_APP_URL)
  ) {
    return true;
  }
};
