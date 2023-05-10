import * as vscode from "vscode";
import { VscodeCommands } from "./commands";
import { updateWorkspaceState } from "./context";
import { TrayNotificationTexts } from "./texts";

export const showSettingsErrorTrayMessage = (message: string) => {
  updateWorkspaceState("cycode.notifOpen", true);
  vscode.window
    .showInformationMessage(message, TrayNotificationTexts.OpenSettings)
    .then((item) => {
      if (item === TrayNotificationTexts.OpenSettings) {
        vscode.commands.executeCommand(VscodeCommands.openSettingsCommandId);
      }
      updateWorkspaceState("cycode.notifOpen", false);
    });
};
