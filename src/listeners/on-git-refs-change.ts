import * as fs from 'node:fs';
import * as path from 'node:path';
import * as vscode from 'vscode';
import { container } from 'tsyringe';
import { CycodeServiceSymbol, LoggerServiceSymbol, StateServiceSymbol } from '../symbols';
import { ICycodeService } from '../services/cycode-service';
import { IStateService, ScanScope } from '../services/state-service';
import { ILoggerService } from '../services/logger-service';

// a single checkout or commit changes the repository state several times in a row
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

const refreshIfDiffScopeIsActive = () => {
  const stateService = container.resolve<IStateService>(StateServiceSymbol);
  if (stateService.globalState.ScanScope === ScanScope.Diff) {
    void container.resolve<ICycodeService>(CycodeServiceSymbol).refreshDiffRefs();
  }
};

/**
 * Keeps the Diff revision dropdowns current while the user switches branches, commits or tags inside the editor,
 * using the built-in git extension (which also handles sub-folder repositories and worktrees).
 * Editors without it (e.g. Theia) get no live updates: the lists are read on activation and whenever Diff is selected.
 */
export const registerOnGitRefsChange = (context: vscode.ExtensionContext) => {
  const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
  const gitExtension = vscode.extensions.getExtension<GitExtension>(GIT_EXTENSION_ID);
  if (!workspaceFolder || !gitExtension) {
    return;
  }

  let debounceTimer: NodeJS.Timeout | undefined;
  const scheduleRefresh = () => {
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(refreshIfDiffScopeIsActive, REFRESH_DEBOUNCE_MS);
  };
  context.subscriptions.push(new vscode.Disposable(() => {
    clearTimeout(debounceTimer);
  }));

  const watchRepository = (repository: GitRepository) => {
    if (!isInsideRepository(workspaceFolder.uri.fsPath, repository.rootUri.fsPath)) {
      return;
    }

    let lastSignature = getRefsSignature(repository);
    context.subscriptions.push(repository.state.onDidChange(() => {
      const signature = getRefsSignature(repository);
      if (signature !== lastSignature) {
        lastSignature = signature;
        scheduleRefresh();
      }
    }));
  };

  // do not await: activating the git extension must not delay this extension's own activation
  void Promise.resolve(gitExtension.isActive ? gitExtension.exports : gitExtension.activate())
    .then((exports) => {
      const api = exports.getAPI(1);
      api.repositories.forEach(watchRepository);
      context.subscriptions.push(api.onDidOpenRepository(watchRepository));
    })
    .catch((error: unknown) => {
      const logger = container.resolve<ILoggerService>(LoggerServiceSymbol);
      logger.warn(`Diff revisions will not update live, the git extension is unavailable: ${String(error)}`);
    });
};
