import * as vscode from "vscode";
import * as fs from "fs";

interface FilePathInContextArgs {
  extensionUri: vscode.Uri;
  path: string;
}

type LoadFileInContext = FilePathInContextArgs;

export function loadHtmlFileInContext(args: LoadFileInContext): string {
  const { extensionUri, path } = args;
  const filePathInContext = getFilePathInExtensionContext({
    extensionUri,
    path,
  });
  return loadFileInExtensionContext(filePathInContext).toString();
}

function loadFileInExtensionContext(filePath: string) {
  return fs.readFileSync(filePath);
}

function getFilePathInExtensionContext(args: FilePathInContextArgs): string {
  const { extensionUri, path } = args;
  return vscode.Uri.joinPath(extensionUri, path).path;
}
