import { verifyFileChecksum } from '../utils/file-checksum';
import * as path from 'path';
import * as os from 'os';
import * as fs from 'fs';
import { inject, singleton } from 'tsyringe';
import { LoggerServiceSymbol } from '../symbols';
import { ILoggerService } from './logger-service';

export interface IDownloadService {
  retrieveFileTextContent(url: string): Promise<string | undefined>;
  downloadFile(url: string, checksum: string | undefined, localPath: string): Promise<void>;
}

@singleton()
export class DownloadService implements IDownloadService {
  constructor(@inject(LoggerServiceSymbol) private logger: ILoggerService) {}

  shouldSaveFile(tempFilePath: string, checksum: string | undefined): boolean {
    return checksum == undefined || verifyFileChecksum(tempFilePath, checksum);
  }

  public async retrieveFileTextContent(url: string): Promise<string | undefined> {
    this.logger.info(`Retrieving file content ${url}`);

    try {
      const response = await fetch(url);
      return await response.text();
    } catch (error) {
      this.logger.error(`Error while retrieving file content: ${error}`);
    }

    return undefined;
  }

  createTempFilename(name: string, prefix = 'cycode-'): Promise<string> {
    return new Promise((resolve, reject) => {
      const tempPath = path.join(os.tmpdir(), prefix);
      fs.mkdtemp(tempPath, (err, folder) => {
        if (err) {
          reject(err);
          return;
        }

        resolve(path.join(folder, name));
      });
    });
  }

  public async downloadFile(url: string, checksum: string | undefined, localPath: string) {
    this.logger.info(`Downloading file ${url} with checksum ${checksum}`);
    this.logger.info(`Expecting to download to ${localPath}`);

    const tempPath = await this.createTempFilename(path.basename(localPath));
    this.logger.info(`Temp file path: ${tempPath}`);

    try {
      const response = await fetch(url);
      const buffer = await response.arrayBuffer();

      fs.writeFileSync(tempPath, Buffer.from(buffer));

      if (this.shouldSaveFile(tempPath, checksum)) {
        if (fs.existsSync(localPath)) {
          fs.unlinkSync(localPath);
        }

        const localPathToCreate = path.dirname(localPath);
        try {
          fs.mkdirSync(localPathToCreate);
        } catch {
          this.logger.warn(
            `Failed to create directories for ${localPathToCreate}. Probably exists already`,
          );
        }

        fs.renameSync(tempPath, localPath);
      }
    } catch (error) {
      this.logger.error(`Error while downloading file: ${error}`);
    } finally {
      if (fs.existsSync(tempPath)) {
        fs.unlinkSync(tempPath);
      }
    }
  }
}
