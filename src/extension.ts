// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from "vscode";

let myStatusBarItem: vscode.StatusBarItem;

// This method is called when your extension is activated
// Your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {
  // Use the console to output diagnostic information (console.log) and errors (console.error)
  // This line of code will only be executed once when your extension is activated
  console.log("Cycode extension is now active");

  const scanCommandId = "cycode.scan";

  // The command has been defined in the package.json file
  // Now provide the implementation of the command with registerCommand
  // The commandId parameter must match the command field in package.json
  let scanCommand = vscode.commands.registerCommand(scanCommandId, () => {
    // The code you place here will be executed every time your command is executed
    // Display a message box to the user
    vscode.window.showInformationMessage("Cycode scanning!");
  });

  // create a new status bar item that we can now manage
  myStatusBarItem = vscode.window.createStatusBarItem(
    vscode.StatusBarAlignment.Right,
    0
  );

  context.subscriptions.push(
    vscode.window.onDidChangeActiveTextEditor(updateStatusBarItem)
  );

  context.subscriptions.push(myStatusBarItem);
  context.subscriptions.push(scanCommand);

  myStatusBarItem.command = scanCommandId;
  updateStatusBarItem();
}

function updateStatusBarItem(): void {
  myStatusBarItem.text = `Scan with CyCode`;
  myStatusBarItem.show();
}

// This method is called when your extension is deactivated
export function deactivate() {}
