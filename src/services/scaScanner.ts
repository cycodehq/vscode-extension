import * as vscode from "vscode";
import { extensionOutput } from "../logging/extension-output";
import { cliWrapper } from "../cli-wrapper/cli-wrapper";
import statusBar from "../utils/status-bar";
import {
  StatusBarTexts,
  TrayNotificationTexts,
  extensionId,
} from "../utils/texts";
import { validateCliCommonErrors } from "./common";
import { getWorkspaceState, updateWorkspaceState } from "../utils/context";
import { Detection } from "../types/detection";
import { IConfig } from "../cli-wrapper/types";
import TrayNotifications from "../utils/TrayNotifications";

// Entry
export async function scaScan(
  context: vscode.ExtensionContext,
  params: {
    workspaceFolderPath: string;
    diagnosticCollection: vscode.DiagnosticCollection;
    config: IConfig;
  },
  extFilePath?: string
) {
  if (getWorkspaceState("scan.isScanning")) {
    return;
  }
  vscode.window.withProgress(
    {
      location: vscode.ProgressLocation.Window,
    },
    async (progress) => {
      try {
        extensionOutput.info(StatusBarTexts.ScanWait);
        statusBar.showScanningInProgress();

        extensionOutput.info(
          "Initiating SCA scan for path: " + params.workspaceFolderPath
        );
        updateWorkspaceState("scan.isScanning", true);

        // Run scan through CLI
        let cliParams = {
          path: params.workspaceFolderPath,
          workspaceFolderPath: params.workspaceFolderPath,
          config: params.config,
        };

        progress.report({
          message: `Scanning ${params.workspaceFolderPath}...`,
        });

        const { result, error, exitCode } = await cliWrapper.runScaScan(
          cliParams
        );

        updateWorkspaceState("scan.isScanning", false);

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
        // handleScanDetections(
        //   result,
        //   // filePath,
        //   params.diagnosticCollection,
        //   // document
        // );

        statusBar.showScanComplete();
      } catch (error) {
        extensionOutput.error("Error while creating scan: " + error);
        statusBar.showScanError();
        updateWorkspaceState("scan.isScanning", false);

        vscode.window.showErrorMessage(TrayNotificationTexts.ScanError);
      }
    }
  );
}

export const detectionsToDiagnostings = (
  detections: Detection[],
  document: vscode.TextDocument
): vscode.Diagnostic[] => {
  return detections
    ?.map((detection) => {
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

      let message = "Severity: High\n";
      message += `${detection.type}: ${detection.message.replace(
        "within '' repository",
        ""
      )}\n`;
      message += `Rule ID: ${detection.detection_rule_id}\n`;
      message += `In file: ${detection.detection_details.file_name}\n`;
      message += `Secret SHA: ${detection.detection_details.sha512}`;

      const diagnostic = new vscode.Diagnostic(
        new vscode.Range(startPosition, endPosition),
        message,
        vscode.DiagnosticSeverity.Error
      );

      diagnostic.source = extensionId;
      diagnostic.code = detection.detection_rule_id;

      return diagnostic;
    })
    .filter((diagnostic) => diagnostic !== undefined) as vscode.Diagnostic[];
};

const handleScanDetections = (
  result: any,
  filePath: string,
  diagnosticCollection: vscode.DiagnosticCollection,
  document: vscode.TextDocument
) => {
  let diagnostics = [];
  if (result.detections) {
    diagnostics = detectionsToDiagnostings(result.detections, document) || [];
    const uri = vscode.Uri.file(filePath);
    diagnosticCollection.set(uri, diagnostics); // Show in problems tab

    if (!diagnostics.length) {
      return;
    }

    if (result.detections.length && !getWorkspaceState("cycode.notifOpen")) {
      updateWorkspaceState("cycode.notifOpen", true);
      TrayNotifications.showProblemsDetection(diagnostics.length);
    }
  }
};
