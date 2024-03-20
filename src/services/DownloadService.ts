import {verifyFileChecksum} from '../utils/FileChecksum';
import extensionOutput from '../logging/extension-output';
import * as path from 'path';
import * as os from 'os';
import * as fs from 'fs';

class DownloadService {
  shouldSaveFile(tempFilePath: string, checksum: string | undefined): boolean {
    return checksum == undefined || verifyFileChecksum(tempFilePath, checksum);
  }

  public async retrieveFileTextContent(url: string): Promise<string | undefined> {
    extensionOutput.info(`Retrieving file content ${url}`);

    try {
      const response = await fetch(url);
      return await response.text();
    } catch (error) {
      extensionOutput.error(`Error while retrieving file content: ${error}`);
    }

    return undefined;
  }

  createTempFilename(name: string, prefix = 'cycode-'): Promise<string> {
    return new Promise((resolve, reject) => {
      const tempPath = path.join(os.tmpdir(), prefix);
      fs.mkdtemp(tempPath, (err, folder) => {
        if (err) {
          return reject(err);
        }

        resolve(path.join(folder, name));
      });
    });
  }

  public async downloadFile(url: string, checksum: string | undefined, localPath: string) {
    extensionOutput.info(`Downloading file ${url} with checksum ${checksum}`);
    extensionOutput.info(`Expecting to download to ${localPath}`);

    const tempPath = await this.createTempFilename(path.basename(localPath));
    extensionOutput.info(`Temp file path: ${tempPath}`);

    try {
      const response = await fetch(url);
      const buffer = await response.arrayBuffer();

      fs.writeFileSync(tempPath, Buffer.from(buffer));

      if (this.shouldSaveFile(tempPath, checksum)) {
        if (fs.existsSync(localPath)) {
          fs.unlinkSync(localPath);
        }

        try {
          fs.mkdirSync(path.dirname(localPath));
        } catch (error) {
          extensionOutput.warn(`Failed to create directories for ${localPath}. Probably exists already`);
        }

        fs.renameSync(tempPath, localPath);
      }
    } catch (error) {
      extensionOutput.error(`Error while downloading file: ${error}`);
    } finally {
      if (fs.existsSync(tempPath)) {
        fs.unlinkSync(tempPath);
      }
    }
  }
}

export const downloadService = new DownloadService();
