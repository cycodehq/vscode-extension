import * as fs from 'fs';
import * as crypto from 'crypto';
import * as path from 'path';
import { container } from 'tsyringe';
import { ILoggerService } from '../services/logger-service';
import { LoggerServiceSymbol } from '../symbols';

const getFileShaHash = (filePath: string): string => {
  const fileBuffer = fs.readFileSync(filePath);
  const hashSum = crypto.createHash('sha256');
  hashSum.update(fileBuffer);

  return hashSum.digest('hex');
};

export const verifyFileChecksum = (filePath: string, checksum: string): boolean => {
  const logger = container.resolve<ILoggerService>(LoggerServiceSymbol);

  if (!fs.existsSync(filePath)) {
    return false;
  }

  try {
    return getFileShaHash(filePath).toLowerCase() === checksum.toLowerCase();
  } catch (error) {
    logger.error(`Failed to verify file checksum ${error}`);
  }

  return false;
};

export const verifyDirContentChecksums = (dirPath: string, checksums: Record<string, string>): boolean => {
  const rootPath = path.resolve(dirPath);
  for (const [file, checksum] of Object.entries(checksums)) {
    const filePath = path.resolve(rootPath, file);
    if (!filePath.startsWith(rootPath + path.sep)) {
      return false;
    }

    if (!verifyFileChecksum(filePath, checksum)) {
      return false;
    }
  }

  return true;
};

/*
 * returns paths of all files inside dirPath, relative to rootPath (the same format as in the checksum db).
 * returns null if the directory contains anything except regular files and directories (e.g. symlinks)
 */
export const listDirFiles = (rootPath: string, dirPath: string): string[] | null => {
  const files: string[] = [];
  for (const entry of fs.readdirSync(dirPath, { withFileTypes: true })) {
    const entryPath = path.join(dirPath, entry.name);
    if (entry.isDirectory()) {
      const nestedFiles = listDirFiles(rootPath, entryPath);
      if (nestedFiles === null) {
        return null;
      }

      files.push(...nestedFiles);
    } else if (entry.isFile()) {
      files.push(path.relative(rootPath, entryPath));
    } else {
      return null;
    }
  }

  return files;
};

export const parseOnedirChecksumDb = (rawChecksumDb: string): Record<string, string> => {
  const checksums: Record<string, string> = {};
  for (const line of rawChecksumDb.split('\n')) {
    const [hash, file] = line.split(' ');
    if (file && hash) {
      checksums[file] = hash;
    }
  }
  return checksums;
};
