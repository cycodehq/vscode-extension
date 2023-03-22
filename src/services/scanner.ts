import * as vscode from "vscode";
import { extensionOutput } from "../logging/extension-output";
import { cliWrapper } from "../cli-wrapper/cli-wrapper";
import statusBar, { StatusBarColor } from "../utils/status-bar";
import { Texts } from "../utils/texts";

const validateScanEnv = async (filePath: string) => {
  // Check if the active tab is the output tab instread of a file
  if (vscode.window?.activeTextEditor?.document?.uri.scheme === "output") {
    extensionOutput.showOutputTab();
    extensionOutput.error("Cannot scan output tab");
    return "Cannot scan output tab";
  }

  // TODO:: also check if completely authed
  if (!(await cliWrapper.config.cliPath)) {
    vscode.window.showInformationMessage(
      "Please complete Cycode configuration"
    );

    vscode.commands.executeCommand("workbench.action.openSettings", "cycode");
    return "Please complete Cycode configuration";
  }
};

// Entry
export async function scan(
  context: vscode.ExtensionContext,
  diagnosticCollection: vscode.DiagnosticCollection,
  extFilePath?: string
) {
  try {
    extensionOutput.info(Texts.ScanWait);
    statusBar.update({ text: Texts.ScanWait });

    let filePath =
      extFilePath || vscode.window.activeTextEditor?.document.fileName || "";

    //  validate
    const invalid = await validateScanEnv(filePath);

    if (invalid) {
      return;
    }

    extensionOutput.info("Initiating scan for file: " + filePath);

    // Run scan through cli
    let params = { path: filePath };
    const { result, error, exitCode } = await cliWrapper.runScan(params);

    // Check if an error occurred
    if (error && !result.detections?.length) {
      throw new Error(error);
    }

    extensionOutput.info(
      "Scan complete: " + JSON.stringify({ result, error }, null, 3)
    );

    // Show in problems tab
    handleScanDetections(result, filePath, diagnosticCollection);

    statusBar.update({ text: Texts.ScanComplete });
  } catch (error) {
    console.error(error);
    extensionOutput.error("Error while creating scan: " + error);
    statusBar.update({
      text: Texts.ScanError,
      color: StatusBarColor.error,
    });
    vscode.window.showErrorMessage(Texts.ScanError);
  }
}

export const detectionsToDiagnostings = (detections: any) => {
  return detections.map((detection: any) => {
    return new vscode.Diagnostic(
      new vscode.Range(
        new vscode.Position(detection.detection_details.line, 0),
        new vscode.Position(
          detection.detection_details.line,
          detection.detection_details.start_position
        )
      ),
      `${detection.type}: ${detection.message}`,
      vscode.DiagnosticSeverity.Error
    );
  });
};

const handleScanDetections = (
  result: any,
  filePath: string,
  diagnosticCollection: vscode.DiagnosticCollection
) => {
  let diagnostics = [];
  if (result.detections) {
    diagnostics = detectionsToDiagnostings(result.detections);

    const uri = vscode.Uri.file(filePath);
    diagnosticCollection.set(uri, diagnostics); // Show in problems tab
    if (result.detections.length) {
      vscode.window
        .showInformationMessage(
          `Cycode has detected ${diagnostics.length} secrets in your file. Check out your “Problems” tab to analyze.`,
          "Open Problems tab"
        )
        .then((item) => {
          item &&
            vscode.commands.executeCommand("workbench.action.problems.focus");
        });
    }
  }
};
