import * as os from 'os';
import * as path from 'path';

export const getVsCodeRootPathPrefix = (): string => {
  // Get the path to the global VS Code app folder based on OS
  // Ref: https://github.com/microsoft/vscode/issues/3884#issue-139391403

  const homeDir = os.homedir();
  let globalConfigPath: string;
  if (process.platform === 'win32') {
    // Windows
    globalConfigPath = path.join(homeDir, 'AppData', 'Roaming', 'Code');
  } else if (process.platform === 'darwin') {
    // macOS
    globalConfigPath = path.join(homeDir, 'Library', 'Application Support', 'Code');
  } else {
    // Linux
    globalConfigPath = path.join(homeDir, '.config', 'Code');
  }

  return globalConfigPath;
};

