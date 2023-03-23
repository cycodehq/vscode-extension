import * as vscode from "vscode";
import { Texts } from "./texts";

let statusBar: vscode.StatusBarItem | null = null;

export enum StatusBarColor {
  info = "statusBarItem.infoBackground",
  error = "statusBarItem.errorBackground",
}
const getStatusBar = () => {
  if (!statusBar) {
    statusBar = vscode.window.createStatusBarItem(
      vscode.StatusBarAlignment.Right,
      0
    );
    statusBar.text = Texts.ScanButton;
    statusBar.show();
  }

  return statusBar;
};

const update = ({
  text,
  hide,
  color = StatusBarColor.info,
}: {
  text: string;
  hide?: boolean;
  color?: StatusBarColor;
}) => {
  const bar = getStatusBar();
  bar.text = text;
  bar.backgroundColor = new vscode.ThemeColor(color);

  hide ? bar.hide() : bar.show();
};

export const module = {
  create: getStatusBar,
  update,
  get statusBar() {
    return getStatusBar();
  },
};

export default module;
