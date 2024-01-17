import * as vscode from 'vscode';

export const getUniqueDiagnostics = (diagnostics: readonly vscode.Diagnostic[]): vscode.Diagnostic[] => {
  // one code line can have multiple diagnostics, we want to show quick fixes without duplicates,
  // for example, one package can have multiple vulnerabilities in case of SCA

  const uniqueDiagnostics: vscode.Diagnostic[] = [];
  const uniqueDiagnosticCodes: string[] = [];

  diagnostics.forEach((diagnostic) => {
    const diagnosticCode = diagnostic.code as string;

    if (!uniqueDiagnosticCodes.includes(diagnosticCode)) {
      uniqueDiagnosticCodes.push(diagnosticCode);
      uniqueDiagnostics.push(diagnostic);
    }
  });

  return uniqueDiagnostics;
};
