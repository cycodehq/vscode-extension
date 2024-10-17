import * as fs from 'fs';
import * as crypto from 'crypto';
import * as path from 'path';
import { captureException } from '../sentry';
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
    captureException(error);
    logger.error(`Failed to verify file checksum ${error}`);
  }

  return false;
};

export const verifyDirContentChecksums = (dirPath: string, checksums: Record<string, string>): boolean => {
  for (const [file, checksum] of Object.entries(checksums)) {
    if (!verifyFileChecksum(path.join(dirPath, file), checksum)) {
      return false;
    }
  }

  return true;
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
