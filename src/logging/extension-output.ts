import * as vscode from 'vscode';

const options: { output?: vscode.OutputChannel } = {};
const log = (level: string, logMessage: string) => {
  if (!options.output) {
    return;
  }
  options.output.appendLine('[' + level + '] ' + logMessage);
};

const info = (logMessage: string) => {
  log('INFO', logMessage);
};

const warn = (logMessage: string) => {
  log('WARN', logMessage);
};

const error = (logMessage: string) => {
  log('ERROR', logMessage);
};

const showOutputTab = () => {
  if (!options.output) {
    return;
  }
  options.output.show();
};

const setOpts = ({output}: { output: vscode.OutputChannel }) => {
  options.output = output;
};

export const extensionOutput = {
  options,
  log,
  setOpts,
  showOutputTab,
  info,
  warn,
  error,
};

export default extensionOutput;
