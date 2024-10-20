import * as vscode from 'vscode';
import { VscodeCommands } from '../commands';
import { TrayNotificationTexts } from './texts';

export const showSettingsError = (message: string) => {
  vscode.window
    .showInformationMessage(message, TrayNotificationTexts.OpenSettings)
    .then((buttonPressed) => {
      if (buttonPressed === TrayNotificationTexts.OpenSettings) {
        vscode.commands.executeCommand(VscodeCommands.OpenSettingsCommandId);
      }
    });
};

export const showMustBeFocusedOnFile = () => vscode.window.showInformationMessage(
  TrayNotificationTexts.MustBeFocusedOnFile,
);

export const showCliInstallFailed = () => vscode.window.showErrorMessage(TrayNotificationTexts.CliInstallError);

export default {
  showSettingsError,
  showMustBeFocusedOnFile,
  showCliInstallFailed,
};
