import * as vscode from "vscode";
import { extensionOutput } from "../logging/extension-output";
import { cliWrapper } from "../cli-wrapper/cli-wrapper";
import statusBar, { StatusBarColor } from "../utils/status-bar";
import { StatusBarTexts, TrayNotificationTexts } from "../utils/texts";
import { validateCliCommonErrors } from "./common";
import { VscodeCommands } from "../utils/commands";
import {
  getGlobalState,
  getWorkspaceState,
  setContext,
  updateGlobalState,
  updateWorkspaceState,
} from "../utils/context";

const validateScanEnv = async (filePath: string) => {
  // Check if the active tab is the output tab instread of a file
  if (vscode.window?.activeTextEditor?.document?.uri.scheme === "output") {
    return "Cannot scan output tab";
  }
};

// Entry
export async function scan(
  context: vscode.ExtensionContext,
  diagnosticCollection: vscode.DiagnosticCollection,
  extFilePath?: string
) {
  try {
    if (getGlobalState("scan.isScanning")) {
      return;
    }

    extensionOutput.info(StatusBarTexts.ScanWait);
    statusBar.showScanningInProgress();

    const document = vscode.window.activeTextEditor?.document;
    let filePath = extFilePath || document?.fileName || "";

    //  validate
    const invalid = await validateScanEnv(filePath);

    if (invalid) {
      return;
    }

    extensionOutput.info("Initiating scan for file: " + filePath);
    updateGlobalState("scan.isScanning", true);

    // Run scan through cli
    let params = { path: filePath };
    const { result, error, exitCode } = await cliWrapper.runScan(params);

    updateGlobalState("scan.isScanning", false);

    if (validateCliCommonErrors(error, exitCode)) {
      return;
    }

    // Check if an error occurred
    if (error && !result.detections?.length) {
      throw new Error(error);
    }

    extensionOutput.info(
      "Scan complete: " + JSON.stringify({ result, error }, null, 3)
    );

    // Show in problems tab
    handleScanDetections(result, filePath, diagnosticCollection, document);

    statusBar.showScanComplete();
  } catch (error) {
    console.error(error);
    extensionOutput.error("Error while creating scan: " + error);
    statusBar.showScanError();
    updateGlobalState("scan.isScanning", false);

    vscode.window.showErrorMessage(TrayNotificationTexts.ScanError);
  }
}

export const detectionsToDiagnostings = (
  detections: any,
  document?: vscode.TextDocument
) => {
  return detections.map((detection: any) => {
    const startPosition = document?.positionAt(
      detection.detection_details.start_position
    );

    const endPosition = document?.positionAt(
      detection.detection_details.start_position +
        detection.detection_details.length
    );

    if (!startPosition || !endPosition) {
      return;
    }

    return new vscode.Diagnostic(
      new vscode.Range(startPosition, endPosition),
      `${detection.type}: ${detection.message}`,
      vscode.DiagnosticSeverity.Error
    );
  });
};

const handleScanDetections = (
  result: any,
  filePath: string,
  diagnosticCollection: vscode.DiagnosticCollection,
  document?: vscode.TextDocument
) => {
  let diagnostics = [];
  if (result.detections) {
    diagnostics = detectionsToDiagnostings(result.detections, document);

    const uri = vscode.Uri.file(filePath);
    diagnosticCollection.set(uri, diagnostics); // Show in problems tab
    if (result.detections.length && !getWorkspaceState("cycode.notifOpen")) {
      updateWorkspaceState("cycode.notifOpen", true);
      vscode.window
        .showInformationMessage(
          `Cycode has detected ${diagnostics.length} secrets in your file. Check out your “Problems” tab to analyze.`,
          "Open Problems tab"
        )
        .then((item) => {
          if (item === "Open Problems tab") {
            vscode.commands.executeCommand(VscodeCommands.ShowProblemsTab);
          }
          updateWorkspaceState("cycode.notifOpen", false);
        });
    }
  }
};
