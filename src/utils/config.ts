import * as vscode from "vscode";
import { extensionId } from "./texts";
import { updateWorkspaceState } from "./context";
import { VscodeCommands } from "./commands";
import { showSettingsErrorTrayMessage } from "./TrayNotifications";

export const config = {
  get cliPath() {
    return (
      (vscode.workspace
        .getConfiguration(extensionId)
        .get("cliPath") as string) || "cycode"
    );
  },
  get cliEnv(): { [key: string]: string } {
    let CYCODE_API_URL = vscode.workspace
      .getConfiguration(extensionId)
      .get("apiUrl") as string;

    let CYCODE_APP_URL = vscode.workspace
      .getConfiguration(extensionId)
      .get("appUrl") as string;

    const env = { CYCODE_API_URL, CYCODE_APP_URL };

    // Remove entries with empty values
    return Object.fromEntries(Object.entries(env).filter(([_, v]) => !!v));
  },
  get additionalParams() {
    const additionalParams = vscode.workspace
      .getConfiguration(extensionId)
      .get("additionalParameters") as string;

    return additionalParams ? additionalParams.split(" ") : [];
  },
};

export const validateConfig = () => {
  const validateURL = (url: string) => {
    if (!url) {
      return null;
    }

    if (!url.startsWith("https")) {
      const message = `URLs must start with https: ${url}`;
      showSettingsErrorTrayMessage(message);

      return message;
    }

    if (!url.endsWith("/")) {
      const message = `URLs must not end with '/': ${url}`;
      showSettingsErrorTrayMessage(message);

      return message;
    }

    try {
      new URL(url);
    } catch (e) {
      const message = `Invalid URL in settings: ${url}`;
      showSettingsErrorTrayMessage(message);
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
