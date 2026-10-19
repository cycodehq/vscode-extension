import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { container } from 'tsyringe';
import { ILoggerService } from '../services/logger-service';
import { ExtensionServiceSymbol, LoggerServiceSymbol } from '../symbols';

export const createTempDir = (): string => fs.mkdtempSync(path.join(os.tmpdir(), 'cycode-test-'));

export class LoggerMock {
  public readonly messages: string[] = [];

  info = (message: string) => this.messages.push(message);
  warn = (message: string) => this.messages.push(message);
  error = (message: string) => this.messages.push(message);
  debug = (message: string) => this.messages.push(message);
}

export const registerLoggerMock = (): LoggerMock => {
  const logger = new LoggerMock();
  container.register(LoggerServiceSymbol, { useValue: logger as unknown as ILoggerService });
  return logger;
};

// getPluginPath() is "<extensionPath>/cycode-vscode-extension"
export const registerExtensionPath = (extensionPath: string): string => {
  container.register(ExtensionServiceSymbol, { useValue: { extensionContext: { extensionPath } } });
  return path.join(extensionPath, 'cycode-vscode-extension');
};
