import * as fs from 'fs';
import * as path from 'path';
import decompress from 'decompress';
import { config } from '../utils/config';
import { GitHubRelease, GitHubReleaseAsset, IGithubReleaseService } from './github-release-service';
import {
  CLI_CHECK_NEW_VERSION_EVERY_SEC,
  CLI_GITHUB,
  getDefaultCliPath,
  getPluginPath,
  REQUIRED_CLI_VERSION,
} from '../constants';
import { parseOnedirChecksumDb, verifyDirContentChecksums, verifyFileChecksum } from '../utils/file-checksum';
import { inject, injectable } from 'tsyringe';
import {
  DownloadServiceSymbol,
  GithubReleaseServiceSymbol,
  LoggerServiceSymbol,
  StateServiceSymbol,
} from '../symbols';
import { GlobalExtensionState, IStateService } from './state-service';
import { ILoggerService } from './logger-service';
import { IDownloadService } from './download-service';

export interface ICliDownloadService {
  initCli(): Promise<void>;
  shouldDownloadCli(): Promise<boolean>;
  shouldDownloadNewRemoteCli(localPath: string, isDir: boolean): Promise<boolean>;
  downloadCli(): Promise<void>;
  downloadOnedirCli(): Promise<void>;
  downloadSingleCliExecutable(): Promise<void>;
  getAssetAndFileChecksum(): Promise<{ asset: GitHubReleaseAsset; expectedChecksum: string } | undefined>;
  getExecutableAsset(): Promise<GitHubReleaseAsset | undefined>;
  getGitHubLatestRelease(forceRefresh: boolean): Promise<GitHubRelease | undefined>;
  getOperatingSystemRelatedReleaseAssetFilename(): string | undefined;
  getOperatingSystemRelatedReleaseAssetHashFilename(): string | undefined;
  getRemoteChecksumFile(forceRefresh: boolean): Promise<string | undefined>;
}

@injectable()
export class CliDownloadService implements ICliDownloadService {
  private githubReleaseInfo?: GitHubRelease;
  private state: GlobalExtensionState;

  constructor(
    @inject(DownloadServiceSymbol) private downloadService: IDownloadService,
    @inject(GithubReleaseServiceSymbol) private githubReleaseService: IGithubReleaseService,
    @inject(StateServiceSymbol) private stateService: IStateService,
    @inject(LoggerServiceSymbol) private logger: ILoggerService,
  ) {
    this.state = this.stateService.globalState;
  }

  async initCli(): Promise<void> {
    // if the CLI path is not overridden and executable is auto managed, and need to download - download it.
    if (config.cliPath == getDefaultCliPath()
      && config.cliAutoManaged
      && await this.shouldDownloadCli()
    ) {
      await this.downloadCli();
      this.logger.info('CLI downloaded/updated successfully');
    }
  }

  async shouldDownloadNewRemoteCli(localPath: string, isDir: boolean): Promise<boolean> {
    if (this.state.CliVer !== REQUIRED_CLI_VERSION) {
      this.logger.info('Should download CLI because version missmatch');
      return true;
    }

    const timeNow = new Date().getTime() / 1000;
    const lastUpdateCheckedAt = this.state.CliLastUpdateCheckedAt;

    if (lastUpdateCheckedAt == null) {
      this.state.CliLastUpdateCheckedAt = timeNow;
      this.stateService.save();
      this.logger.info('Should not download CLI because cliLastUpdateCheckedAt is Null. First plugin run.');
      return false;
    }

    const diffInSec = timeNow - lastUpdateCheckedAt;
    if (diffInSec < CLI_CHECK_NEW_VERSION_EVERY_SEC) {
      this.logger.info(
        [
          `Should not check remote CLI version because diffInSec is ${Math.round(diffInSec)}`,
          `and less than ${CLI_CHECK_NEW_VERSION_EVERY_SEC}`,
        ].join(' '),
      );
      return false;
    } else {
      this.state.CliLastUpdateCheckedAt = timeNow;
      this.stateService.save();
    }

    const remoteChecksum = await this.getRemoteChecksumFile(true);
    if (remoteChecksum == undefined) {
      this.logger.warn('Should not download new CLI because can\'t get remoteChecksum');
      return false;
    }

    const isValidChecksum = isDir
      ? verifyDirContentChecksums(localPath, parseOnedirChecksumDb(remoteChecksum))
      : verifyFileChecksum(localPath, remoteChecksum);

    if (!isValidChecksum) {
      this.logger.info('Should download CLI because checksum doesn\'t match remote checksum');
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
    const cliDirHashes = this.state.CliDirHashes;

    if (cliDirHashes === null) {
      this.logger.info('Should download CLI because CliDirHashes is null');
      return true;
    }

    if (!verifyDirContentChecksums(getPluginPath(), cliDirHashes)) {
      this.logger.info('Should download CLI because one of checksum is invalid');
      return true;
    }

    if (await this.shouldDownloadNewRemoteCli(getPluginPath(), true)) {
      return true;
    }

    this.logger.info('Should not download CLI because all checks passed');
    return false;
  }

  async shouldDownloadSingleCliExecutable(): Promise<boolean> {
    const cliHash = this.state.CliHash;
    if (cliHash === null) {
      this.logger.info('Should download CLI because CliHash is null');
      return true;
    }

    if (!verifyFileChecksum(getDefaultCliPath(), cliHash)) {
      this.logger.info('Should download CLI because checksum is invalid');
      return true;
    }

    if (await this.shouldDownloadNewRemoteCli(getDefaultCliPath(), false)) {
      return true;
    }

    this.logger.info('Should not download CLI because all checks passed');
    return false;
  }

  async downloadCli(): Promise<void> {
    if (process.platform === 'darwin') {
      await this.downloadOnedirCli();
      return;
    }

    await this.downloadSingleCliExecutable();
  }

  async downloadOnedirCli(): Promise<void> {
    const assetAndFileChecksum = await this.getAssetAndFileChecksum();
    if (assetAndFileChecksum == undefined) {
      this.logger.warn('Failed to get asset and file checksum');
      return;
    }

    const pathToZip = path.join(getPluginPath(), 'cycode-cli.zip');

    /*
     * we don't verify the checksum of the directory because it's not a single file
     * we will verify the checksum of the files inside the directory later
     */
    await this.downloadService.downloadFile(assetAndFileChecksum.asset.browser_download_url, undefined, pathToZip);

    const cliExecutableFile = getDefaultCliPath();

    const pathToCliDir = path.dirname(cliExecutableFile);
    this.logger.info(`Decompressing ${pathToZip} to ${pathToCliDir}`);
    await decompress(pathToZip, pathToCliDir);

    this.logger.info(`Removing ${pathToZip}`);
    fs.unlinkSync(pathToZip);

    // set executable permissions
    fs.chmodSync(cliExecutableFile, '755');

    this.state.CliDirHashes = parseOnedirChecksumDb(assetAndFileChecksum.expectedChecksum);
    this.stateService.save();
  }

  async downloadSingleCliExecutable(): Promise<void> {
    const assetAndFileChecksum = await this.getAssetAndFileChecksum();
    if (assetAndFileChecksum == undefined) {
      this.logger.warn('Failed to get asset and file checksum');
      return;
    }

    await this.downloadService.downloadFile(
      assetAndFileChecksum.asset.browser_download_url,
      assetAndFileChecksum.expectedChecksum,
      getDefaultCliPath(),
    );

    // set executable permissions
    fs.chmodSync(getDefaultCliPath(), '755');

    this.state.CliHash = assetAndFileChecksum.expectedChecksum;
    this.stateService.save();
  }

  async getAssetAndFileChecksum(): Promise<{ asset: GitHubReleaseAsset; expectedChecksum: string } | undefined> {
    const executableAsset = await this.getExecutableAsset();
    if (executableAsset == undefined) {
      this.logger.warn('Failed to get executableAsset');
      return undefined;
    }

    const expectedFileChecksum = await this.getRemoteChecksumFile();
    if (expectedFileChecksum == undefined) {
      this.logger.warn('Failed to get expectedFileChecksum');
      return undefined;
    }

    return { asset: executableAsset, expectedChecksum: expectedFileChecksum };
  }

  async getExecutableAsset(): Promise<GitHubReleaseAsset | undefined> {
    const releaseInfo = await this.getGitHubLatestRelease();
    if (releaseInfo?.assets == undefined) {
      this.logger.warn('Failed to get latest release info');
      return undefined;
    }

    const executableAssetName = this.getOperatingSystemRelatedReleaseAssetFilename();
    if (executableAssetName == undefined) {
      this.logger.warn('Failed to get asset names. Unknown operating system');
      return undefined;
    }

    const executableAsset = this.githubReleaseService.findAssetByFilename(releaseInfo.assets, executableAssetName);
    if (executableAsset == undefined) {
      this.logger.warn('Failed to find executableAsset');
      return undefined;
    }

    return executableAsset;
  }

  async getGitHubLatestRelease(forceRefresh = false): Promise<GitHubRelease | undefined> {
    if (this.githubReleaseInfo != undefined && !forceRefresh) {
      return this.githubReleaseInfo;
    }

    this.githubReleaseInfo = await this.githubReleaseService.getReleaseInfoByTag(
      CLI_GITHUB.OWNER,
      CLI_GITHUB.REPO,
      CLI_GITHUB.TAG,
    );
    return this.githubReleaseInfo;
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

    /*
     * TODO(MarshalX): mb we should rename GitHub asset to remove this hack
     *   but there is question about .sha256 of zip and zip content
     */
    if (filename.endsWith('.zip')) {
      return filename.slice(0, -4) + '.sha256';
    }

    return `${filename}.sha256`;
  }

  async getRemoteChecksumFile(forceRefresh = false): Promise<string | undefined> {
    const releaseInfo = await this.getGitHubLatestRelease(forceRefresh);
    if (releaseInfo?.assets == undefined) {
      this.logger.warn('Failed to get latest release info');
      return undefined;
    }

    const executableAssetHashName = this.getOperatingSystemRelatedReleaseAssetHashFilename();
    if (executableAssetHashName == undefined) {
      this.logger.warn('Failed to get asset names. Unknown operating system');
      return undefined;
    }

    const executableHashAsset = this.githubReleaseService.findAssetByFilename(
      releaseInfo.assets, executableAssetHashName,
    );
    if (executableHashAsset == undefined) {
      this.logger.warn('Failed to find executableHashAsset');
      return undefined;
    }

    return await this.downloadService.retrieveFileTextContent(executableHashAsset.browser_download_url);
  }
}
