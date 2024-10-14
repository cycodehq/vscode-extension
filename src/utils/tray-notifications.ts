import * as vscode from 'vscode';
import { VscodeCommands } from '../commands';
import { TrayNotificationTexts } from './texts';
import { getScanTypeDisplayName, ScanType } from '../constants';

export const showSettingsError = (message: string) => {
  vscode.window
    .showInformationMessage(message, TrayNotificationTexts.OpenSettings)
    .then((buttonPressed) => {
      if (buttonPressed === TrayNotificationTexts.OpenSettings) {
        vscode.commands.executeCommand(VscodeCommands.OpenSettingsCommandId);
      }
    });
};

export const showAuthFailed = () => {
  vscode.window
    .showInformationMessage(
      TrayNotificationTexts.BadAuth,
      TrayNotificationTexts.OpenCycodeViewText,
    )
    .then((buttonPressed) => {
      if (buttonPressed === TrayNotificationTexts.OpenCycodeViewText) {
        vscode.commands.executeCommand(VscodeCommands.ShowCycodeView);
      }
    });
};

export const showAuthSuccess = () => vscode.window.showInformationMessage(TrayNotificationTexts.AuthCompleted);

export const showMustBeFocusedOnFile = () => vscode.window.showInformationMessage(
  TrayNotificationTexts.MustBeFocusedOnFile,
);

export const showIgnoreFailed = () => vscode.window.showErrorMessage(TrayNotificationTexts.IgnoreError);

export const showIgnoreSuccess = () => vscode.window.showInformationMessage(TrayNotificationTexts.IgnoreCompleted);

export const showCliInstallFailed = () => vscode.window.showErrorMessage(TrayNotificationTexts.CliInstallError);

export const showProblemsDetection = (numDetections: number, scanType: ScanType) => {
  vscode.window
    .showInformationMessage(
      `Cycode has detected ${numDetections} ${getScanTypeDisplayName(scanType)} 
          issues in your file. Check out your “Problems” tab to analyze.`,
      TrayNotificationTexts.OpenProblemsTab,
    )
    .then((buttonPressed) => {
      if (buttonPressed === TrayNotificationTexts.OpenProblemsTab) {
        vscode.commands.executeCommand(VscodeCommands.ShowProblemsTab);
      }
    });
};

export default {
  showSettingsError,
  showAuthFailed,
  showAuthSuccess,
  showMustBeFocusedOnFile,
  showIgnoreFailed,
  showIgnoreSuccess,
  showCliInstallFailed,
  showProblemsDetection,
};
