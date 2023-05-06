import * as vscode from "vscode";
import { VscodeCommands } from "./commands";
import { updateWorkspaceState } from "./context";

export const showSettingsErrorTrayMessage = (message: string) => {
  updateWorkspaceState("cycode.notifOpen", true);
  vscode.window
    .showInformationMessage(message, "Open settings")
    .then((item) => {
      if (item === "Open settings") {
        vscode.commands.executeCommand(VscodeCommands.openSettingsCommandId);
      }
      updateWorkspaceState("cycode.notifOpen", false);
    });
};
