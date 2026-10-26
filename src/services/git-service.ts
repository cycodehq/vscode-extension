import { execFile } from 'node:child_process';
import { inject, singleton } from 'tsyringe';
import { LoggerServiceSymbol } from '../symbols';
import { ILoggerService } from './logger-service';
import { HEAD_REF_VALUE } from '../cli/constants';

export interface GitRefOption {
  value: string;
  label: string;
}

export interface IGitService {
  /**
   * Lists branches, tags and recent commits. `pinnedRefs` (e.g. the user's stored selection) that are not
   * part of that list but still resolve to a commit are included too, described like the recent commits.
   */
  getAvailableRefs(cwd: string, pinnedRefs?: string[]): Promise<GitRefOption[]>;

  /**
   * Resolves two picked revisions into the `base..tip` range holding what one side added on top of the other,
   * whichever way round they were picked. Throws an Error with a message fit for the user when there is nothing
   * to compare (same commit, no common history) or a revision cannot be resolved.
   */
  getCommitRange(cwd: string, fromRef: string, toRef: string): Promise<string>;

  /** False only when git says the folder is not inside a repository; any other failure is left to later steps. */
  isGitRepository(cwd: string): Promise<boolean>;
}

// exit code git uses when the given revision cannot be resolved
const GIT_BAD_REVISION_EXIT_CODE = 128;

// keeps git's exit code (a number) apart from spawn failure codes such as ENOENT (a string)
class GitCommandError extends Error {
  constructor(message: string, public readonly code: number | string | undefined) {
    super(message);
    this.name = 'GitCommandError';
  }
}

// exit code of `rev-parse --verify --quiet` for an unknown revision and of `merge-base` without a common ancestor
const GIT_NOT_FOUND_EXIT_CODE = 1;
const NOT_A_REPOSITORY_REGEX = /not a git repository/i;

// normal situations rather than failures: a folder that is not a repository, or a repository without commits yet
const EXPECTED_GIT_FAILURE_REGEX = /not a git repository|does not have any commits yet|ambiguous argument 'HEAD'/i;

const MAX_RECENT_COMMITS = 20;
const MAX_BRANCHES_AND_TAGS = 20;
const COMMIT_HASH_REGEX = /^[0-9a-f]{4,40}$/i;

@singleton()
export class GitService implements IGitService {
  constructor(@inject(LoggerServiceSymbol) private logger: ILoggerService) {}

  private runGit(args: string[], cwd: string): Promise<string> {
    return new Promise((resolve, reject) => {
      // execFile does not spawn a shell, so args are passed as an argv array rather than interpolated
      execFile('git', args, { cwd }, (error, stdout) => {
        if (error) {
          reject(new GitCommandError(error.message, error.code ?? undefined));
          return;
        }

        resolve(stdout);
      });
    });
  }

  private async getCurrentBranch(cwd: string): Promise<string | null> {
    const stdout = await this.runGit(['rev-parse', '--abbrev-ref', 'HEAD'], cwd);
    const branch = stdout.trim();

    // "HEAD" means we are in detached HEAD state, i.e. not actually on a branch
    return branch && branch !== 'HEAD' ? branch : null;
  }

  private buildHeadOption(currentBranch: string | null): GitRefOption {
    return { value: HEAD_REF_VALUE, label: currentBranch ? `${currentBranch} (HEAD)` : HEAD_REF_VALUE };
  }

  private async getBranchesAndTags(cwd: string): Promise<{ refs: GitRefOption[]; tipHashes: Set<string> }> {
    const stdout = await this.runGit(
      [
        'for-each-ref', '--sort=-committerdate', `--count=${MAX_BRANCHES_AND_TAGS}`,
        '--format=%(refname:short)\t%(objectname:short)', 'refs/heads', 'refs/tags',
      ],
      cwd,
    );

    const refs: GitRefOption[] = [];
    const tipHashes = new Set<string>();
    for (const line of stdout.split('\n')) {
      const [name, hash] = line.trim().split('\t');
      if (!name) {
        continue;
      }

      refs.push({ value: name, label: name });
      if (hash) {
        tipHashes.add(hash);
      }
    }

    return { refs, tipHashes };
  }

  // recent commits come from `git log` on the currently checked-out ref, so that ref is their branch
  private buildCommitLabel(currentBranch: string | null, hash: string, subject?: string): string {
    return [currentBranch, hash, subject].filter(Boolean).join(' │ ');
  }

  private isBadRevisionError(error: unknown): boolean {
    return error instanceof GitCommandError && error.code === GIT_BAD_REVISION_EXIT_CODE;
  }

  private async isAncestorOfHead(cwd: string, ref: string): Promise<boolean> {
    try {
      await this.runGit(['merge-base', '--is-ancestor', ref, 'HEAD'], cwd);
      return true;
    } catch {
      return false;
    }
  }

  private async describePinnedRefs(
    cwd: string, pinnedRefs: string[], listedValues: Set<string>, currentBranch: string | null,
  ): Promise<GitRefOption[]> {
    const unlisted = [...new Set(pinnedRefs)].filter((ref) => !listedValues.has(ref));

    const options = await Promise.all(unlisted.map(async (ref): Promise<GitRefOption | null> => {
      // a leading '-' would be read by git as an option rather than a revision
      if (!ref || ref.startsWith('-')) {
        return null;
      }

      try {
        const stdout = await this.runGit(['log', '-1', '--pretty=%h\t%s', ref, '--'], cwd);
        const [hash, subject] = stdout.trim().split('\t');
        if (!hash) {
          return null;
        }

        /*
         * users compare branches in the Diff scope, so which branch a commit belongs to is part of what they choose
         * between. the prefix is only right for commits that are part of the current branch, so it is checked here
         * (at most two cheap calls, and only for a stored revision that scrolled out of the recent-commits list)
         * rather than labelling a commit with a branch it isn't on.
         */
        const branch = currentBranch && await this.isAncestorOfHead(cwd, ref) ? currentBranch : null;
        /*
         * keep the stored value as the option value so the existing selection keeps matching it;
         * a branch or tag that fell outside the cap is labelled by its name, a commit by branch/hash/subject
         */
        const label = COMMIT_HASH_REGEX.test(ref) ? this.buildCommitLabel(branch, hash, subject) : ref;
        return { value: ref, label };
      } catch (error: unknown) {
        if (this.isBadRevisionError(error)) {
          this.logger.debug(`Pinned git ref does not exist in this repository: ${ref}`);
          return null;
        }

        // anything else (git missing, killed, ...) says nothing about the ref, so let the caller decide
        throw error;
      }
    }));

    return options.filter((option): option is GitRefOption => option !== null);
  }

  private async getRecentCommits(cwd: string, currentBranch: string | null): Promise<GitRefOption[]> {
    const stdout = await this.runGit(
      ['log', `--pretty=%h\t%s`, `-n`, `${MAX_RECENT_COMMITS}`],
      cwd,
    );

    return stdout
      .split('\n')
      .map((line) => line.trim())
      .filter(Boolean)
      .map((line) => {
        const [hash, subject] = line.split('\t');
        return { value: hash, label: this.buildCommitLabel(currentBranch, hash, subject) };
      });
  }

  // anything that is not an expected situation (e.g. git missing) is worth a warning
  private logFailure(message: string, error: unknown): void {
    if (!(error instanceof Error)) {
      return;
    }

    if (EXPECTED_GIT_FAILURE_REGEX.test(error.message)) {
      this.logger.debug(`${message}: ${error.message}`);
    } else {
      this.logger.warn(`${message}: ${error.message}`);
    }
  }

  public async isGitRepository(cwd: string): Promise<boolean> {
    try {
      await this.runGit(['rev-parse', '--is-inside-work-tree'], cwd);
      return true;
    } catch (error: unknown) {
      if (error instanceof Error && NOT_A_REPOSITORY_REGEX.test(error.message)) {
        this.logger.debug(`Not a git repository: ${cwd}`);
        return false;
      }

      this.logFailure('Failed to check for a git repository', error);
      return true;
    }
  }

  private isExitCode(error: unknown, code: number): boolean {
    return error instanceof GitCommandError && error.code === code;
  }

  // anything that is not a clear answer from git (missing binary, killed, corrupt repository) is not blamed on the refs
  private buildCompareFailure(message: string, error: unknown): Error {
    this.logFailure(message, error);

    if (error instanceof Error && NOT_A_REPOSITORY_REGEX.test(error.message)) {
      return new Error('The opened folder is not a git repository, so there are no revisions to compare.');
    }

    return new Error('Could not compare the selected revisions. See the Cycode output for details.');
  }

  private async resolveCommit(cwd: string, ref: string): Promise<string> {
    // a leading '-' would be read by git as an option rather than a revision
    if (!ref || ref.startsWith('-')) {
      throw new Error(`"${ref}" is not a valid revision.`);
    }

    try {
      return (await this.runGit(['rev-parse', '--verify', '--quiet', `${ref}^{commit}`], cwd)).trim();
    } catch (error: unknown) {
      // --quiet turns an unknown revision into a silent exit code 1
      if (this.isExitCode(error, GIT_NOT_FOUND_EXIT_CODE)) {
        throw new Error(`Could not find revision "${ref}" in this repository.`);
      }

      throw this.buildCompareFailure(`Failed to resolve revision ${ref}`, error);
    }
  }

  private async findMergeBase(cwd: string, fromSha: string, toSha: string): Promise<string> {
    try {
      return (await this.runGit(['merge-base', fromSha, toSha], cwd)).trim();
    } catch (error: unknown) {
      // exit code 1 is git's answer for "no common ancestor"
      if (this.isExitCode(error, GIT_NOT_FOUND_EXIT_CODE)) {
        throw new Error('The two selected revisions have no common history to compare.');
      }

      throw this.buildCompareFailure('Failed to find the merge base', error);
    }
  }

  /*
   * `from..to` alone lists nothing when `to` is the older of two commits on one line of history (the usual
   * result of picking them newest-first), and `from...to` also pulls in whatever the other branch gained since
   * they diverged. The merge base keeps the range to what the newer/diverged side added, and an ancestor `to`
   * is treated as "compare back from `from`" so the pick order doesn't matter.
   * The range is built from full SHAs, so ref names can't be reinterpreted by the CLI.
   */
  public async getCommitRange(cwd: string, fromRef: string, toRef: string): Promise<string> {
    const [fromSha, toSha] = await Promise.all([this.resolveCommit(cwd, fromRef), this.resolveCommit(cwd, toRef)]);
    if (fromSha === toSha) {
      throw new Error('The two selected revisions are the same commit, so there is nothing to compare.');
    }

    const base = await this.findMergeBase(cwd, fromSha, toSha);

    return base === toSha ? `${toSha}..${fromSha}` : `${base}..${toSha}`;
  }

  public async getAvailableRefs(cwd: string, pinnedRefs: string[] = []): Promise<GitRefOption[]> {
    try {
      const currentBranch = await this.getCurrentBranch(cwd).catch((error: unknown) => {
        this.logFailure('Failed to resolve current branch', error);
        return null;
      });
      const headOption = this.buildHeadOption(currentBranch);

      const [{ refs: branchesAndTags, tipHashes }, recentCommits] = await Promise.all([
        this.getBranchesAndTags(cwd),
        this.getRecentCommits(cwd, currentBranch),
      ]);

      // a recent commit that is also the tip of a branch/tag is already listed under that ref's name
      const uniqueRecentCommits = recentCommits.filter((ref) => !tipHashes.has(ref.value));

      const listed = [headOption, ...branchesAndTags, ...uniqueRecentCommits];
      const listedValues = new Set(listed.map((ref) => ref.value));
      const pinned = await this.describePinnedRefs(cwd, pinnedRefs, listedValues, currentBranch);

      return [...listed, ...pinned];
    } catch (error: unknown) {
      this.logFailure('Failed to list git refs; the Diff dropdowns will only offer HEAD', error);

      return [];
    }
  }
}
