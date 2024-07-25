import * as fs from 'fs';
import * as crypto from 'crypto';
import * as path from 'path';
import extensionOutput from '../logging/extension-output';
import {captureException} from '../sentry';

const getFileShaHash = (filePath: string): string => {
  const fileBuffer = fs.readFileSync(filePath);
  const hashSum = crypto.createHash('sha256');
  hashSum.update(fileBuffer);

  return hashSum.digest('hex');
};

export const verifyFileChecksum = (filePath: string, checksum: string): boolean => {
  if (!fs.existsSync(filePath)) {
    return false;
  }

  try {
    return getFileShaHash(filePath).toLowerCase() === checksum.toLowerCase();
  } catch (error) {
    captureException(error);
    extensionOutput.error(`Failed to verify file checksum ${error}`);
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
