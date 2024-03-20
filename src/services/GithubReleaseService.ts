import extensionOutput from '../logging/extension-output';

export interface GitHubReleaseAsset {
  name: string;
  browser_download_url: string;
}

export interface GitHubRelease {
  tag_name: string;
  name: string;
  assets: GitHubReleaseAsset[];
}

class GithubReleaseService {
  async getReleaseInfoByTag(
      owner: string, repo: string, tag: string
  ): Promise<GitHubRelease | undefined> {
    try {
      const apiUrl = `https://api.github.com/repos/${owner}/${repo}/releases/tags/${tag}`;
      const response = await fetch(apiUrl);
      return await response.json() as GitHubRelease;
    } catch (error) {
      extensionOutput.error('Error while getting GitHub release: ' + error);
      return undefined;
    }
  }

  findAssetByFilename(assets: GitHubReleaseAsset[], filename: string): GitHubReleaseAsset | undefined {
    return assets.find((asset) => asset.name === filename);
  }
}

export const githubReleaseService = new GithubReleaseService();
