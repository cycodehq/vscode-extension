import * as fs from 'fs';
import * as path from 'path';
import { spawn } from 'child_process';
import { container } from 'tsyringe';
import { getPluginPath } from '../constants';
import { ILoggerService } from '../services/logger-service';
import { LoggerServiceSymbol } from '../symbols';

const _isPathInsideDir = (childPath: string, parentDir: string): boolean => {
  /*
   * we don't resolve symlinks because the destination directory doesn't exist yet.
   * both paths are built from the same root, so the comparison stays consistent
   */
  const relativePath = path.relative(parentDir, childPath);
  return relativePath.length > 0 && !relativePath.startsWith('..') && !path.isAbsolute(relativePath);
};

/*
 * extract a zip archive using the OS provided extractor.
 * only macOS is supported because it's the only platform where we download an archived (onedir) CLI.
 * "ditto" is a part of the base macOS installation. it preserves file modes
 * and doesn't follow symlinks pointing outside of the destination directory.
 */
export const unzip = (pathToZip: string, destinationPath: string): Promise<void> => {
  const logger = container.resolve<ILoggerService>(LoggerServiceSymbol);

  if (process.platform !== 'darwin') {
    return Promise.reject(new Error(`Unzipping is not supported on ${process.platform}`));
  }

  const resolvedPathToZip = path.resolve(pathToZip);
  const resolvedDestinationPath = path.resolve(destinationPath);
  const pluginPath = getPluginPath();

  /*
   * both arguments are always built from the plugin path. we assert it to keep the path traversal
   * closed if they ever start to depend on dynamic data (user input, CLI response, etc.)
   */
  if (!_isPathInsideDir(resolvedPathToZip, pluginPath) || !_isPathInsideDir(resolvedDestinationPath, pluginPath)) {
    logger.error(`Refusing to unzip ${resolvedPathToZip} to ${resolvedDestinationPath}. Both must be in ${pluginPath}`);
    return Promise.reject(new Error('Unzipping is allowed only within the plugin directory'));
  }

  fs.mkdirSync(resolvedDestinationPath, { recursive: true });

  // we don't use a shell to not care about escaping of the paths. they may contain spaces
  const childProcess = spawn('ditto', ['-x', '-k', resolvedPathToZip, resolvedDestinationPath]);

  let stderr = '';

  return new Promise((resolve, reject) => {
    childProcess.stderr.on('data', (data) => {
      stderr += data.toString();
    });

    // we receive all "data" events before close
    childProcess.on('close', (code: number) => {
      if (code === 0) {
        resolve();
        return;
      }

      logger.error(`Failed to unzip ${resolvedPathToZip}. Exit code: ${code}. Stderr: ${stderr}`);
      reject(new Error(`Failed to unzip ${resolvedPathToZip}: ${stderr.trim() || `exit code ${code}`}`));
    });

    childProcess.on('error', (error: Error) => {
      logger.error(`Failed to run the unzip command: ${error}`);
      reject(error);
    });
  });
};
