import { Detection } from "../../types/detection";
import { FileScanResults } from "./provider";
import { TreeView, SeverityFirstLetter } from "./types";

interface SetViewTitleArgs {
  treeView: TreeView;
  detections: Detection[];
}

interface RefreshTreeViewDataArgs {
  detections: Detection[];
  treeView?: TreeView;
}

type TreeViewDisplayedData = {
  severityFirstLetter: SeverityFirstLetter;
  lineNumber: number;
  type: string;
};

type SeverityCounted = { [severity: string]: number };

const VSCODE_ENTRY_LINE_NUMBER = 1;

export function refreshTreeViewData(
  args: RefreshTreeViewDataArgs
): void {
  const { detections, treeView } = args;
  if (treeView === undefined) {
    return;
  }

  const { provider } = treeView;
  setViewTitle({ detections, treeView: treeView });
  const affectedFiles: FileScanResults[] = [];
  const detectionsMapped = mapDetectionsByFileName(detections);
  detectionsMapped.forEach((vulnerabilities, fileName) => {
    affectedFiles.push(new FileScanResults(fileName, vulnerabilities));
  });
  provider.refresh(affectedFiles);
}

function mapDetectionsByFileName(
  detections: Detection[]
): Map<string, TreeViewDisplayedData[]> {
  const resultMap: Map<string, TreeViewDisplayedData[]> = new Map();

  detections.forEach((detection) => {
    const { type, detection_details, severity } = detection;
    const { line, file_name } = detection_details;

    const valueItem: TreeViewDisplayedData = {
      severityFirstLetter: mapSeverityToFirstLetter(severity),
      lineNumber: line + VSCODE_ENTRY_LINE_NUMBER, // CLI starts counting from 0, although vscode starts from line 1.
      type,
    };

    if (resultMap.has(file_name)) {
      resultMap.get(file_name)!.push(valueItem);
    } else {
      resultMap.set(file_name, [valueItem]);
    }
  });

  return resultMap;
}

function mapSeverityToFirstLetter(severity: string): SeverityFirstLetter {
  switch (severity.toLowerCase()) {
    case "low":
      return SeverityFirstLetter.Low;
    case "medium":
      return SeverityFirstLetter.Medium;
    case "high":
      return SeverityFirstLetter.High;
    case "critical":
      return SeverityFirstLetter.Critical;
    default:
      throw new Error(
        `Supplied unsupported severity ${severity}, can not map to severity first letter`
      );
  }
}

function setViewTitle(args: SetViewTitleArgs): void {
  const { detections, treeView } = args;
  const { provider, view } = treeView;
  const totalDetections = detections.length;
  const treeViewTitle = `Hardcoded Secrets - ${totalDetections} vulnerabilities: ${mapDetectionsToSeverityString(
    detections
  )}`;
  provider.setViewTitle({
    treeViewItem: view,
    title: treeViewTitle,
  });
}

function mapDetectionsToSeverityString(detections: Detection[]): string {
  const severityToCount: SeverityCounted = {};

  for (const detection of detections) {
    const { severity } = detection;

    if (severityToCount[severity] === undefined) {
      severityToCount[severity] = 1;
    } else {
      severityToCount[severity] += 1;
    }
  }

  const severityStrings = Object.entries(severityToCount).map(
    ([severity, count]) => `${count} ${severity}`
  );

  return severityStrings.join(" | ");
}
