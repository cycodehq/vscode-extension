import * as vscode from 'vscode';

export const aggregateDiagnosticsByCode = (
    diagnostics: readonly vscode.Diagnostic[]
): Map<string, vscode.Diagnostic[]> => {
  const aggregatedDiagnostics = new Map<string, vscode.Diagnostic[]>();

  diagnostics.forEach((diagnostic) => {
    const diagnosticCode = diagnostic.code as string;

    if (!aggregatedDiagnostics.has(diagnosticCode)) {
      aggregatedDiagnostics.set(diagnosticCode, []);
    }

    aggregatedDiagnostics.get(diagnosticCode)?.push(diagnostic);
  });

  return aggregatedDiagnostics;
};
