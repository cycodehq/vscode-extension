import * as vscode from 'vscode';
import { extensionId } from '../../utils/texts';

export const aggregateDiagnosticsByCode = (
  diagnostics: readonly vscode.Diagnostic[],
): Map<string, vscode.Diagnostic[]> => {
  const aggregatedDiagnostics = new Map<string, vscode.Diagnostic[]>();

  diagnostics.forEach((diagnostic) => {
    if (diagnostic.source !== extensionId || !diagnostic.code || typeof diagnostic.code !== 'string') {
      // if diagnostics came from an external source or something wrong with code, we don't want to aggregate them
      return;
    }

    if (!aggregatedDiagnostics.has(diagnostic.code)) {
      aggregatedDiagnostics.set(diagnostic.code, []);
    }

    aggregatedDiagnostics.get(diagnostic.code)?.push(diagnostic);
  });

  return aggregatedDiagnostics;
};
