import * as vscode from "vscode";
import * as fs from "fs";
import * as path from "path";

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
  const givenPath = path.join(filePath);
  const normalizedPath = path.normalize(givenPath);

  if (normalizedPath !== givenPath) {
    throw new Error(
      `Invalid file path ${filePath}. The path contains '..' or '.'.`
    );
  }

  return fs.readFileSync(givenPath);
}

function getFilePathInExtensionContext(args: FilePathInContextArgs): string {
  const { extensionUri, path } = args;
  return vscode.Uri.joinPath(extensionUri, path).path;
}
