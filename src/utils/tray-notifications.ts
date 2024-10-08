import * as vscode from 'vscode';
import {VscodeCommands} from '../commands';
import {updateWorkspaceState} from './context';
import {TrayNotificationTexts} from './texts';
import {getScanTypeDisplayName, ScanType} from '../constants';
import {VscodeStates} from './states';

export const showSettingsError = (message: string) => {
  updateWorkspaceState(VscodeStates.NotificationIsOpen, true);
  vscode.window
      .showInformationMessage(message, TrayNotificationTexts.OpenSettings)
      .then((buttonPressed) => {
        if (buttonPressed === TrayNotificationTexts.OpenSettings) {
          vscode.commands.executeCommand(VscodeCommands.OpenSettingsCommandId);
        }
        updateWorkspaceState(VscodeStates.NotificationIsOpen, false);
      });
};

export const showAuthFailed = () => {
  updateWorkspaceState(VscodeStates.NotificationIsOpen, true);
  vscode.window
      .showInformationMessage(
          TrayNotificationTexts.BadAuth,
          TrayNotificationTexts.OpenCycodeViewText
      )
      .then((buttonPressed) => {
        buttonPressed === TrayNotificationTexts.OpenCycodeViewText &&
        vscode.commands.executeCommand(VscodeCommands.ShowCycodeView);
        updateWorkspaceState(VscodeStates.NotificationIsOpen, false);
      });
};

export const showAuthSuccess = () =>
  vscode.window.showInformationMessage(TrayNotificationTexts.AuthCompleted);

export const showMustBeFocusedOnFile = () =>
  vscode.window.showInformationMessage(
      TrayNotificationTexts.MustBeFocusedOnFile
  );

export const showIgnoreFailed = () =>
  vscode.window.showErrorMessage(TrayNotificationTexts.IgnoreError);

export const showIgnoreSuccess = () =>
  vscode.window.showInformationMessage(TrayNotificationTexts.IgnoreCompleted);

export const showCliInstallFailed = () =>
  vscode.window.showErrorMessage(TrayNotificationTexts.CliInstallError);

export const showProblemsDetection = (numDetections: number, scanType: ScanType) => {
  vscode.window
      .showInformationMessage(
          `Cycode has detected ${numDetections} ${getScanTypeDisplayName(scanType)} 
          issues in your file. Check out your “Problems” tab to analyze.`,
          TrayNotificationTexts.OpenProblemsTab
      )
      .then((buttonPressed) => {
        if (buttonPressed === TrayNotificationTexts.OpenProblemsTab) {
          vscode.commands.executeCommand(VscodeCommands.ShowProblemsTab);
        }
        updateWorkspaceState(VscodeStates.NotificationIsOpen, false);
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
