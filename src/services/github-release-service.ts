import {inject, injectable} from 'tsyringe';
import {LoggerServiceSymbol} from '../symbols';
import {ILoggerService} from './logger-service';

export interface GitHubReleaseAsset {
  name: string;
  browser_download_url: string;
}

export interface GitHubRelease {
  tag_name: string;
  name: string;
  assets: GitHubReleaseAsset[];
}

export interface IGithubReleaseService {
  getReleaseInfoByTag(owner: string, repo: string, tag: string): Promise<GitHubRelease | undefined>;
  findAssetByFilename(assets: GitHubReleaseAsset[], filename: string): GitHubReleaseAsset | undefined;
}

@injectable()
export class GithubReleaseService implements IGithubReleaseService {
  constructor(@inject(LoggerServiceSymbol) private logger: ILoggerService) {}

  async getReleaseInfoByTag(
      owner: string, repo: string, tag: string
  ): Promise<GitHubRelease | undefined> {
    try {
      const apiUrl = `https://api.github.com/repos/${owner}/${repo}/releases/tags/${tag}`;
      const response = await fetch(apiUrl);
      return await response.json() as GitHubRelease;
    } catch (error) {
      this.logger.error(`Error while getting GitHub release: ${error}`);
      return undefined;
    }
  }

  findAssetByFilename(assets: GitHubReleaseAsset[], filename: string): GitHubReleaseAsset | undefined {
    return assets.find((asset) => asset.name === filename);
  }
}
