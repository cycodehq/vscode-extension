import * as fs from 'node:fs';
import * as path from 'node:path';
import * as vscode from 'vscode';
import { container } from 'tsyringe';
import { CycodeServiceSymbol, LoggerServiceSymbol, StateServiceSymbol } from '../symbols';
import { ICycodeService } from '../services/cycode-service';
import { IStateService, ScanScope } from '../services/state-service';
import { ILoggerService } from '../services/logger-service';

// a single checkout or commit touches several files under .git at once
const REFRESH_DEBOUNCE_MS = 300;

/*
 * only the parts of the built-in `vscode.git` extension API that are used here
 * (https://github.com/microsoft/vscode/blob/main/extensions/git/src/api/git.d.ts)
 */
const GIT_EXTENSION_ID = 'vscode.git';
const GIT_REF_TYPE_HEAD = 0;
const GIT_REF_TYPE_TAG = 2;

interface GitRef {
  type: number;
  name?: string;
  commit?: string;
}

interface GitRepository {
  rootUri: vscode.Uri;
  state: { HEAD?: GitRef; refs?: GitRef[]; onDidChange: vscode.Event<void> };
}

interface GitApi {
  repositories: GitRepository[];
  onDidOpenRepository: vscode.Event<GitRepository>;
}

interface GitExtension {
  getAPI(version: 1): GitApi;
}

const refreshIfDiffScopeIsActive = () => {
  const stateService = container.resolve<IStateService>(StateServiceSymbol);
  if (stateService.globalState.ScanScope === ScanScope.Diff) {
    void container.resolve<ICycodeService>(CycodeServiceSymbol).refreshDiffRefs();
  }
};

// state.onDidChange also fires for every working tree / index change, so only react when branches, tags or HEAD move
const getRefsSignature = (repository: GitRepository): string => {
  const refs = (repository.state.refs ?? [])
    .filter((ref) => ref.type === GIT_REF_TYPE_HEAD || ref.type === GIT_REF_TYPE_TAG)
    .map((ref) => `${ref.type}:${ref.name}@${ref.commit}`)
    .sort();
  const head = repository.state.HEAD;
  return [`HEAD:${head?.name}@${head?.commit}`, ...refs].join('\n');
};

const resolveRealPath = (target: string): string => {
  try {
    return fs.realpathSync(target);
  } catch {
    return target;
  }
};

/*
 * The git extension reports the real (symlink-resolved) repository root, while the CLI and the rest of this
 * extension work from the workspace folder, which may be a symlink or a sub-folder of the repository.
 */
const isInsideRepository = (projectRoot: string, repositoryRoot: string): boolean => {
  const relative = path.relative(resolveRealPath(repositoryRoot), resolveRealPath(projectRoot));
  return relative === '' || (!relative.startsWith('..') && !path.isAbsolute(relative));
};

const watchViaGitExtension = async (
  context: vscode.ExtensionContext, projectRoot: string, scheduleRefresh: () => void, onRepositoryWatched: () => void,
): Promise<boolean> => {
  try {
    const extension = vscode.extensions.getExtension<GitExtension>(GIT_EXTENSION_ID);
    if (!extension) {
      return false;
    }

    const gitExtension = extension.isActive ? extension.exports : await extension.activate();
    const api = gitExtension.getAPI(1);

    let watchedRepositories = 0;
    const watchRepository = (repository: GitRepository) => {
      if (!isInsideRepository(projectRoot, repository.rootUri.fsPath)) {
        return;
      }

      watchedRepositories++;
      onRepositoryWatched();

      let lastSignature = getRefsSignature(repository);
      context.subscriptions.push(repository.state.onDidChange(() => {
        const signature = getRefsSignature(repository);
        if (signature !== lastSignature) {
          lastSignature = signature;
          scheduleRefresh();
        }
      }));
    };

    api.repositories.forEach(watchRepository);
    context.subscriptions.push(api.onDidOpenRepository(watchRepository));

    // repositories can still be discovered later (handled above), which also retires the file watcher fallback
    return watchedRepositories > 0;
  } catch (error: unknown) {
    const logger = container.resolve<ILoggerService>(LoggerServiceSymbol);
    logger.debug(`Git extension API is not available: ${error instanceof Error ? error.message : String(error)}`);
    return false;
  }
};

/**
 * Fallback for editors without the `vscode.git` extension (e.g. Theia): watch the files git rewrites
 * on checkout (HEAD), commit and branch/tag changes. Remote refs are deliberately left out because
 * auto-fetch rewrites them regularly and they are not listed in the Diff dropdowns.
 */
const watchViaFileSystem = (
  workspaceFolder: vscode.WorkspaceFolder, scheduleRefresh: () => void,
): vscode.FileSystemWatcher => {
  const watcher = vscode.workspace.createFileSystemWatcher(
    new vscode.RelativePattern(workspaceFolder, '.git/{HEAD,packed-refs,refs/heads/**,refs/tags/**}'),
  );
  watcher.onDidChange(scheduleRefresh);
  watcher.onDidCreate(scheduleRefresh);
  watcher.onDidDelete(scheduleRefresh);
  return watcher;
};

export const registerOnGitRefsChange = (context: vscode.ExtensionContext) => {
  let debounceTimer: NodeJS.Timeout | undefined;
  const scheduleRefresh = () => {
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(refreshIfDiffScopeIsActive, REFRESH_DEBOUNCE_MS);
  };

  // the file watcher only stands in until the git extension reports a matching repository
  let fallbackWatcher: vscode.FileSystemWatcher | undefined;
  const onRepositoryWatched = () => {
    fallbackWatcher?.dispose();
    fallbackWatcher = undefined;
  };

  context.subscriptions.push(new vscode.Disposable(() => {
    clearTimeout(debounceTimer);
    fallbackWatcher?.dispose();
  }));

  const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
  if (workspaceFolder) {
    void watchViaGitExtension(
      context, workspaceFolder.uri.fsPath, scheduleRefresh, onRepositoryWatched,
    ).then((usingGitExtension) => {
      if (!usingGitExtension) {
        fallbackWatcher = watchViaFileSystem(workspaceFolder, scheduleRefresh);
      }
    });
  }

  // covers changes made by tools outside the editor that neither of the above can see
  context.subscriptions.push(vscode.window.onDidChangeWindowState((windowState) => {
    if (windowState.focused) {
      refreshIfDiffScopeIsActive();
    }
  }));
};
