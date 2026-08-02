import * as fs from 'fs';
import { spawn } from 'child_process';
import { container } from 'tsyringe';
import { ILoggerService } from '../services/logger-service';
import { LoggerServiceSymbol } from '../symbols';

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

  fs.mkdirSync(destinationPath, { recursive: true });

  // we don't use a shell to not care about escaping of the paths. they may contain spaces
  const childProcess = spawn('ditto', ['-x', '-k', pathToZip, destinationPath]);

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

      logger.error(`Failed to unzip ${pathToZip}. Exit code: ${code}. Stderr: ${stderr}`);
      reject(new Error(`Failed to unzip ${pathToZip}: ${stderr.trim() || `exit code ${code}`}`));
    });

    childProcess.on('error', (error: Error) => {
      logger.error(`Failed to run the unzip command: ${error}`);
      reject(error);
    });
  });
};
