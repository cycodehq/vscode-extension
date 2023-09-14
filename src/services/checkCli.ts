import * as vscode from 'vscode';
import * as semver from 'semver';
import extensionOutput from '../logging/extension-output';
import cliWrapper from '../cli-wrapper/cli-wrapper';
import statusBar from '../utils/status-bar';
import {TrayNotificationTexts} from '../utils/texts';
import {IConfig} from '../cli-wrapper/types';
import {MinCLIVersion} from '../cli-wrapper/constants';
import {showInvalidCLIVersionError} from '../utils/TrayNotifications';

const validateCLI = async (params: {
  workspaceFolderPath: string;
  config: IConfig;
}): Promise<boolean> => {
  let result;

  const getVersionMethods = [cliWrapper.getRunnableGetVersionCommand, cliWrapper.getRunnableGetVersionLegacyCommand];
  for (const getVersion of getVersionMethods) {
    const versionResult = await getVersion(params).getResultPromise();
    if (versionResult.exitCode === 0) {
      result = versionResult.result;
      break;
    }
  }

  if (!result) {
    return false;
  }

  extensionOutput.info('CLI found!');
  // we are using text output because runGetVersionLegacy doesn't support JSON output.
  const currentVersion = result.data.split(' ')[2].trim();

  if (!semver.satisfies(currentVersion, `>=${MinCLIVersion}`)) {
    extensionOutput.error(
        `CLI version is ${currentVersion} but minimum required version is ${MinCLIVersion}`
    );
    showInvalidCLIVersionError(currentVersion, MinCLIVersion);
    return false;
  }

  return true;
};

export async function checkCLI(
    params: { workspaceFolderPath: string; config: IConfig }
) {
  try {
    extensionOutput.info('Trying to run CLI...');
    const cliExist = await validateCLI(params);

    if (cliExist) {
      return;
    }

    // CLI is missing or outdated. try to install/upgrade:
    extensionOutput.info('CLI not found. Trying to install...');
    const exitCode = (await cliWrapper.getRunnablePipInstallCommand(params).getResultPromise()).exitCode;

    if (exitCode !== 0) {
      extensionOutput.error('Failed to install cycode CLI');
      throw new Error('Failed to install cycode CLI');
    }

    // try again
    extensionOutput.info('Trying to run CLI after install...');
    const cliExistAfterInstall = await validateCLI(params);

    if (!cliExistAfterInstall) {
      throw new Error('Failed to install cycode CLI');
    }

    extensionOutput.info('CLI Installed!');
  } catch (error) {
    extensionOutput.error('Error while checking if CLI exists: ' + error);
    vscode.window.showErrorMessage(TrayNotificationTexts.InstallError);
    statusBar.showCliPathError();

    throw (error);
  }
}
