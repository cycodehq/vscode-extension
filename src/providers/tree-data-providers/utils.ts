import { Detection } from "../../types/detection";
import { FileScanResults } from "./hardcoded-secrets-provider";
import { HardcodedSecretsTree, SeverityFirstLetter } from "./types";

interface SetViewTitleArgs {
  hardcodedSecretsTree: HardcodedSecretsTree;
  detections: Detection[];
}

interface RefreshTreeViewDataArgs {
  detections: Detection[];
  hardcodedSecretsTree?: HardcodedSecretsTree;
}

type HardcodedDisplayedData = {
  severityFirstLetter: SeverityFirstLetter;
  lineNumber: number;
  type: string;
};

type SeverityCounted = { [severity: string]: number };

export function refreshHardcodedSecretsTreeViewData(
  args: RefreshTreeViewDataArgs
): void {
  const { detections, hardcodedSecretsTree } = args;
  if (hardcodedSecretsTree === undefined) {
    return;
  }

  const { provider } = hardcodedSecretsTree;
  setViewTitle({ detections, hardcodedSecretsTree });
  const hardCodedFiles: FileScanResults[] = [];
  const detectionsMapped = mapDetectionsByFileName(detections);
  detectionsMapped.forEach((hardcodedSecrets, fileName) => {
    hardCodedFiles.push(new FileScanResults(fileName, hardcodedSecrets));
  });
  provider.refresh(hardCodedFiles);
}

function mapDetectionsByFileName(
  detections: Detection[]
): Map<string, HardcodedDisplayedData[]> {
  const resultMap: Map<string, HardcodedDisplayedData[]> = new Map();

  detections.forEach((detection) => {
    const { type, detection_details, severity } = detection;
    const { line, file_name } = detection_details;

    const valueItem: HardcodedDisplayedData = {
      severityFirstLetter: mapSeverityToFirstLetter(severity),
      lineNumber: line,
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
  switch (severity) {
    case "High":
      return SeverityFirstLetter.High;
    default:
      throw new Error(
        `Supplied unsupported severity ${severity}, can not map to severity first letter`
      );
  }
}

function setViewTitle(args: SetViewTitleArgs): void {
  const { detections, hardcodedSecretsTree } = args;
  const { provider, view } = hardcodedSecretsTree;
  const totalDetections = detections.length;
  const treeViewTitle = `Hardcoded Secrets - ${totalDetections} vulnerabilities: ${mapDetectionsToSeverityString(
    detections
  )}`;
  provider.setViewTitle({
    hardcodedSecretsTreeView: view,
    title: treeViewTitle,
  });
}

function mapDetectionsToSeverityString(detections: Detection[]): string {
  const severityCount = detections.reduce<SeverityCounted>((acc, detection) => {
    const { severity } = detection;
    acc[severity] = (acc[severity] || 0) + 1;
    return acc;
  }, {});

  const severityStrings = Object.entries(severityCount).map(
    ([severity, count]) => `${count} ${severity}`
  );

  return severityStrings.join(" | ");
}
