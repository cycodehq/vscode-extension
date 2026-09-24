import * as fs from 'fs';
import * as path from 'path';

const WINDOWS_PATH_WITH_LEADING_SLASH_REGEX = /^\/[a-zA-Z]:/;

const getRealPath = (filePath: string): string | null => {
  // on Windows detection paths can look like "/C:/project/file", which is a valid URI path but not a valid FS path
  const hasExtraLeadingSlash = process.platform === 'win32' && WINDOWS_PATH_WITH_LEADING_SLASH_REGEX.test(filePath);
  const fsPath = hasExtraLeadingSlash ? filePath.slice(1) : filePath;

  try {
    // resolves symlinks, so a symlink inside a project which points outside of it is detected
    return fs.realpathSync.native(fsPath);
  } catch {
    return null;
  }
};

/*
 * checks that the file exists and that its real location is one of the root paths or inside of them.
 * root paths can be files or directories
 */
export const isPathInsideAnyRoot = (filePath: string, rootPaths: string[]): boolean => {
  const realFilePath = getRealPath(filePath);
  if (!realFilePath) {
    return false;
  }

  return rootPaths.some((rootPath) => {
    const realRootPath = getRealPath(rootPath);
    if (!realRootPath) {
      return false;
    }

    const relativePath = path.relative(realRootPath, realFilePath);
    return relativePath === ''
      || (relativePath !== '..' && !relativePath.startsWith(`..${path.sep}`) && !path.isAbsolute(relativePath));
  });
};
