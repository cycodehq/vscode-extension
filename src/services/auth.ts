import * as vscode from "vscode";
import { extensionOutput } from "../logging/extension-output";
import { cliWrapper } from "../cli-wrapper/cli-wrapper";

export async function auth(context: vscode.ExtensionContext) {
  extensionOutput.showOutputTab();

  // TODO:: also check if completely authed
  if (!(await cliWrapper.config.cliPath)) {
    vscode.window.showInformationMessage(
      "Please complete Cycode configuration"
    );

    vscode.commands.executeCommand("workbench.action.openSettings", "cycode");
    return;
  }

  const params = {};
  const { result, error, exitCode } = await cliWrapper.configure({
    client_id: "",
    secret: "",
  });
  extensionOutput.info(
    "Auth completed: " + JSON.stringify({ result, error }, null, 3)
  );
}
