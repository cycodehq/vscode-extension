import * as fs from 'fs';
import * as path from 'path';
import * as decompress from 'decompress';
import {config} from '../utils/config';
import extensionOutput from '../logging/extension-output';
import {GitHubRelease, GitHubReleaseAsset, githubReleaseService} from './GithubReleaseService';
import {
  CLI_CHECK_NEW_VERSION_EVERY_SEC,
  CLI_GITHUB,
  getDefaultCliPath,
  getPluginPath,
  REQUIRED_CLI_VERSION,
} from '../constants';
import {downloadService} from './DownloadService';
import {getGlobalState, updateGlobalState} from '../utils/context';
import {VscodeStates} from '../utils/states';
import {parseOnedirChecksumDb, verifyDirContentChecksums, verifyFileChecksum} from '../utils/FileChecksum';

class CliDownloadService {
  private gitHubReleaseService: GitHubRelease | undefined;

  async initCli(): Promise<void> {
    // if the CLI path is not overridden and executable is auto managed, and need to download - download it.
    if (config.cliPath == getDefaultCliPath() &&
        config.cliAutoManaged &&
        await this.shouldDownloadCli()
    ) {
      await this.downloadCli();
      extensionOutput.info('CLI downloaded/updated successfully');
    }
  }

  async shouldDownloadNewRemoteCli(localPath: string, isDir: boolean): Promise<boolean> {
    if (getGlobalState(VscodeStates.CliVersion) !== REQUIRED_CLI_VERSION) {
      extensionOutput.info('Should download CLI because version missmatch');
      return true;
    }

    const timeNow = new Date().getTime() / 1000;
    const lastUpdateCheckedAt = getGlobalState(VscodeStates.CliLastUpdateCheckedAt) as number;

    if (lastUpdateCheckedAt == undefined) {
      updateGlobalState(VscodeStates.CliLastUpdateCheckedAt, timeNow);
      extensionOutput.info('Should not download CLI because cliLastUpdateCheckedAt is Null. First plugin run.');
      return false;
    }

    const diffInSec = timeNow - lastUpdateCheckedAt;
    if (diffInSec < CLI_CHECK_NEW_VERSION_EVERY_SEC) {
      extensionOutput.info(
          [
            `Should not check remote CLI version because diffInSec is ${Math.round(diffInSec)}`,
            `and less than ${CLI_CHECK_NEW_VERSION_EVERY_SEC}`,
          ].join(' '),
      );
      return false;
    } else {
      updateGlobalState(VscodeStates.CliLastUpdateCheckedAt, timeNow);
    }

    const remoteChecksum = await this.getRemoteChecksumFile(true);
    if (remoteChecksum == undefined) {
      extensionOutput.warn('Should not download new CLI because can\'t get remoteChecksum');
      return false;
    }

    const isValidChecksum = isDir ?
        verifyDirContentChecksums(localPath, parseOnedirChecksumDb(remoteChecksum)) :
        verifyFileChecksum(localPath, remoteChecksum);

    if (!isValidChecksum) {
      extensionOutput.info('Should download CLI because checksum doesn\'t mach remote checksum');
      return true;
    }

    return false;
  }

  async shouldDownloadCli(): Promise<boolean> {
    if (process.platform === 'darwin') {
      return await this.shouldDownloadOnedirCli();
    }

    return await this.shouldDownloadSingleCliExecutable();
  }

  async shouldDownloadOnedirCli(): Promise<boolean> {
    const cliDirHashes = getGlobalState<Record<string, string>>(VscodeStates.CliDirHashes);
    if (cliDirHashes === undefined) {
      extensionOutput.info('Should download CLI because CliDirHashes is undefined');
      return true;
    }

    if (!verifyDirContentChecksums(getPluginPath(), cliDirHashes)) {
      extensionOutput.info('Should download CLI because one of checksum is invalid');
      return true;
    }

    if (await this.shouldDownloadNewRemoteCli(getPluginPath(), true)) {
      return true;
    }

    extensionOutput.info('Should not download CLI because all checks passed');
    return false;
  }

  async shouldDownloadSingleCliExecutable(): Promise<boolean> {
    const cliHash = getGlobalState<string>(VscodeStates.CliHash);
    if (cliHash === undefined) {
      extensionOutput.info('Should download CLI because CliHash is undefined');
      return true;
    }

    if (!verifyFileChecksum(getDefaultCliPath(), cliHash)) {
      extensionOutput.info('Should download CLI because checksum is invalid');
      return true;
    }

    if (await this.shouldDownloadNewRemoteCli(getDefaultCliPath(), false)) {
      return true;
    }

    extensionOutput.info('Should not download CLI because all checks passed');
    return false;
  }

  async downloadCli(): Promise<void> {
    if (process.platform === 'darwin') {
      return await this.downloadOnedirCli();
    }

    return await this.downloadSingleCliExecutable();
  }

  async downloadOnedirCli(): Promise<void> {
    const assetAndFileChecksum = await this.getAssetAndFileChecksum();
    if (assetAndFileChecksum == undefined) {
      extensionOutput.warn('Failed to get asset and file checksum');
      return;
    }

    const pathToZip = path.join(getPluginPath(), 'cycode-cli.zip');
    // we don't verify the checksum of the directory because it's not a single file
    // we will verify the checksum of the files inside the directory later
    await downloadService.downloadFile(assetAndFileChecksum.asset.browser_download_url, undefined, pathToZip);

    const cliExecutableFile = getDefaultCliPath();

    const pathToCliDir = path.dirname(cliExecutableFile);
    extensionOutput.info(`Decompressing ${pathToZip} to ${pathToCliDir}`);
    await decompress(pathToZip, pathToCliDir);

    extensionOutput.info(`Removing ${pathToZip}`);
    fs.unlinkSync(pathToZip);

    // set executable permissions
    fs.chmodSync(cliExecutableFile, '755');

    updateGlobalState(VscodeStates.CliDirHashes, parseOnedirChecksumDb(assetAndFileChecksum.expectedChecksum));
  }

  async downloadSingleCliExecutable(): Promise<void> {
    const assetAndFileChecksum = await this.getAssetAndFileChecksum();
    if (assetAndFileChecksum == undefined) {
      extensionOutput.warn('Failed to get asset and file checksum');
      return;
    }

    const downloadedFilePath = await downloadService.downloadFile(
        assetAndFileChecksum.asset.browser_download_url,
        assetAndFileChecksum.expectedChecksum,
        getDefaultCliPath(),
    );

    if (downloadedFilePath == undefined) {
      extensionOutput.warn('Failed to download file');
      return;
    }

    // set executable permissions
    fs.chmodSync(downloadedFilePath, '755');

    updateGlobalState(VscodeStates.CliHash, assetAndFileChecksum.expectedChecksum);
  }

  async getAssetAndFileChecksum(): Promise<{ asset: GitHubReleaseAsset; expectedChecksum: string } | undefined> {
    const executableAsset = await this.getExecutableAsset();
    if (executableAsset == undefined) {
      extensionOutput.warn('Failed to get executableAsset');
      return undefined;
    }

    const expectedFileChecksum = await this.getRemoteChecksumFile();
    if (expectedFileChecksum == undefined) {
      extensionOutput.warn('Failed to get expectedFileChecksum');
      return undefined;
    }

    return {asset: executableAsset, expectedChecksum: expectedFileChecksum};
  }

  async getExecutableAsset(): Promise<GitHubReleaseAsset | undefined> {
    const releaseInfo = await this.getGitHubSupportedRelease();
    if (releaseInfo == undefined) {
      extensionOutput.warn('Failed to get latest release info');
      return undefined;
    }

    const executableAssetName = this.getOperatingSystemRelatedReleaseAssetFilename();
    if (executableAssetName == undefined) {
      extensionOutput.warn('Failed to get asset names. Unknown operating system');
      return undefined;
    }

    const executableAsset = githubReleaseService.findAssetByFilename(releaseInfo.assets, executableAssetName);
    if (executableAsset == undefined) {
      extensionOutput.warn('Failed to find executableAsset');
      return undefined;
    }

    return executableAsset;
  }

  async getGitHubSupportedRelease(forceRefresh: boolean = false): Promise<GitHubRelease | undefined> {
    if (this.gitHubReleaseService != undefined && !forceRefresh) {
      return this.gitHubReleaseService;
    }

    this.gitHubReleaseService = await githubReleaseService.getReleaseInfoByTag(
        CLI_GITHUB.OWNER,
        CLI_GITHUB.REPO,
        CLI_GITHUB.TAG,
    );
    return this.gitHubReleaseService;
  }

  getOperatingSystemRelatedReleaseAssetFilename(): string | undefined {
    const isArm = process.arch === 'arm64';

    switch (process.platform) {
      case 'win32':
        return 'cycode-win.exe';
      case 'darwin':
        return isArm ? 'cycode-mac-arm-onedir.zip' : 'cycode-mac-onedir.zip';
      case 'linux':
        return 'cycode-linux';
      default:
        return undefined;
    }
  }

  getOperatingSystemRelatedReleaseAssetHashFilename(): string | undefined {
    const filename = this.getOperatingSystemRelatedReleaseAssetFilename();
    if (filename == undefined) {
      return undefined;
    }

    // TODO(MarshalX): mb we should rename GitHub asset to remove this hack
    //   but there is question about .sha256 of zip and zip content
    if (filename.endsWith('.zip')) {
      return filename.slice(0, -4) + '.sha256';
    }

    return `${filename}.sha256`;
  }

  async getRemoteChecksumFile(forceRefresh: boolean = false): Promise<string | undefined> {
    const releaseInfo = await this.getGitHubSupportedRelease(forceRefresh);
    if (releaseInfo == undefined) {
      extensionOutput.warn('Failed to get latest release info');
      return undefined;
    }

    const executableAssetHashName = this.getOperatingSystemRelatedReleaseAssetHashFilename();
    if (executableAssetHashName == undefined) {
      extensionOutput.warn('Failed to get asset names. Unknown operating system');
      return undefined;
    }

    const executableHashAsset = githubReleaseService.findAssetByFilename(releaseInfo.assets, executableAssetHashName);
    if (executableHashAsset == undefined) {
      extensionOutput.warn('Failed to find executableHashAsset');
      return undefined;
    }

    return await downloadService.retrieveFileTextContent(executableHashAsset.browser_download_url);
  }
}

export const cliDownloadService = new CliDownloadService();
