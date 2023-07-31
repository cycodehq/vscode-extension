import * as vscode from "vscode";
import { VscodeCommands } from "./commands";
import { updateWorkspaceState } from "./context";
import { TrayNotificationTexts } from "./texts";

export const showSettingsError = (message: string) => {
  updateWorkspaceState("cycode.notifOpen", true);
  vscode.window
    .showInformationMessage(message, TrayNotificationTexts.OpenSettings)
    .then((buttonPressed) => {
      if (buttonPressed === TrayNotificationTexts.OpenSettings) {
        vscode.commands.executeCommand(VscodeCommands.OpenSettingsCommandId);
      }
      updateWorkspaceState("cycode.notifOpen", false);
    });
};

export const showAuthFailed = () => {
  updateWorkspaceState("cycode.notifOpen", true);
  vscode.window
    .showInformationMessage(
      TrayNotificationTexts.BadAuth,
      TrayNotificationTexts.OpenCycodeViewText
    )
    .then((buttonPressed) => {
      buttonPressed === TrayNotificationTexts.OpenCycodeViewText &&
        vscode.commands.executeCommand(VscodeCommands.ShowCycodeView);
      updateWorkspaceState("cycode.notifOpen", false);
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

export const showInstallFailed = () =>
  vscode.window.showErrorMessage(TrayNotificationTexts.InstallError);

export const showInstallSuccess = () =>
  vscode.window.showInformationMessage(TrayNotificationTexts.InstallCompleted);

export const showUninstallFailed = () =>
  vscode.window.showErrorMessage(TrayNotificationTexts.UninstallError);

export const showUninstallSuccess = () =>
  vscode.window.showInformationMessage(
    TrayNotificationTexts.UninstallCompleted
  );

export const showProblemsDetection = (numDetections: number) =>
  vscode.window
    .showInformationMessage(
      `Cycode has detected ${numDetections} secrets in your file. Check out your “Problems” tab to analyze.`,
      TrayNotificationTexts.OpenProblemsTab
    )
    .then((buttonPressed) => {
      if (buttonPressed === TrayNotificationTexts.OpenProblemsTab) {
        vscode.commands.executeCommand(VscodeCommands.ShowProblemsTab);
      }
      updateWorkspaceState("cycode.notifOpen", false);
    });

export const showInvalidCLIVersionError = (
  currentVersion: string,
  minVersion: string
) =>
  vscode.window.showErrorMessage(
    `Cycode CLI version ${currentVersion} is not supported. Please upgrade to version ${minVersion} or higher.`
  );

export default {
  showSettingsError,
  showAuthFailed,
  showAuthSuccess,
  showMustBeFocusedOnFile,
  showIgnoreFailed,
  showIgnoreSuccess,
  showInstallFailed,
  showInstallSuccess,
  showProblemsDetection,
  showUninstallSuccess,
  showUninstallFailed,
};
