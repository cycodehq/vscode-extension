import * as vscode from 'vscode';
import {singleton} from 'tsyringe';
import {extensionName} from '../utils/texts';

export interface LoggerOptions {
  output?: vscode.OutputChannel;
}

export interface ILoggerService {
  initLogger(): void;
  log(level: string, logMessage: string): void;
  info(logMessage: string): void;
  warn(logMessage: string): void;
  error(logMessage: string): void;
  debug(logMessage: string): void;
  showOutputTab(): void;
  setOutput(output: vscode.OutputChannel): void;
}

@singleton()
export class LoggerService implements ILoggerService {
  private options: LoggerOptions = {};

  initLogger(): void {
    this.options.output = vscode.window.createOutputChannel(extensionName);
  }

  log(level: string, logMessage: string): void {
    if (!this.options.output) {
      return;
    }

    const formattedLogMessage = `${new Date().toISOString()} [${level}] ${logMessage}`;
    this.options.output.appendLine(formattedLogMessage);
  }

  info(logMessage: string): void {
    this.log('INFO', logMessage);
  }

  warn(logMessage: string): void {
    this.log('WARN', logMessage);
  }

  error(logMessage: string): void {
    this.log('ERROR', logMessage);
  }

  debug(logMessage: string): void {
    this.log('DEBUG', logMessage);
  }

  showOutputTab(): void {
    if (!this.options.output) {
      return;
    }
    this.options.output.show();
  }

  setOutput(output: vscode.OutputChannel): void {
    this.options.output = output;
  }
}
