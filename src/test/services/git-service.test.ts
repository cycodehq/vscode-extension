import * as assert from 'assert';
import { execFileSync } from 'child_process';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { GitService } from '../../services/git-service';
import { ILoggerService } from '../../services/logger-service';
import { createTempDir } from '../helpers';

const GIT_ENV = {
  ...process.env,
  GIT_AUTHOR_NAME: 'Test',
  GIT_AUTHOR_EMAIL: 'test@example.com',
  GIT_COMMITTER_NAME: 'Test',
  GIT_COMMITTER_EMAIL: 'test@example.com',
  GIT_CONFIG_GLOBAL: os.devNull,
  GIT_CONFIG_NOSYSTEM: '1',
};

const isGitAvailable = (): boolean => {
  try {
    execFileSync('git', ['--version'], { stdio: 'ignore' });
    return true;
  } catch {
    return false;
  }
};

suite('GitService.getAvailableRefs', function () {
  // creating the repositories needs a few dozen git processes
  this.timeout(30000);

  let repoDir: string;
  let warnings: string[];
  let service: GitService;

  const git = (...args: string[]): string => {
    const output = execFileSync('git', args, { cwd: repoDir, env: GIT_ENV });
    return output.toString().trim();
  };
  const commit = (subject: string) => git('-c', 'commit.gpgsign=false', 'commit', '--allow-empty', '-m', subject);
  const shortHash = (rev: string) => git('log', '-1', '--pretty=%h', rev);

  setup(function () {
    if (!isGitAvailable()) {
      this.skip();
    }

    repoDir = createTempDir();
    git('init', '-q', '-b', 'main');
    warnings = [];
    service = new GitService({
      debug: () => undefined,
      warn: (message: string) => warnings.push(message),
    } as unknown as ILoggerService);
  });

  teardown(() => {
    if (repoDir) {
      fs.rmSync(repoDir, { recursive: true, force: true });
    }
  });

  test('lists HEAD first, named after the current branch', async () => {
    commit('first');

    const refs = await service.getAvailableRefs(repoDir);

    assert.deepStrictEqual(refs[0], { value: 'HEAD', label: 'main (HEAD)' });
    assert.ok(refs.some((ref) => ref.value === 'main' && ref.label === 'main'));
  });

  test('lists recent commits as "branch │ hash │ subject" and does not repeat a branch tip', async () => {
    commit('first');
    commit('second');

    const refs = await service.getAvailableRefs(repoDir);

    const firstHash = shortHash('HEAD~1');
    assert.ok(refs.some((ref) => ref.value === firstHash && ref.label === `main │ ${firstHash} │ first`));
    // the tip of main is already listed as "main"
    assert.ok(!refs.some((ref) => ref.label.endsWith('│ second')));
  });

  test('caps the number of branches and tags', async () => {
    commit('first');
    for (let i = 0; i < 25; i++) {
      git('branch', `feature-${i}`);
    }

    const refs = await service.getAvailableRefs(repoDir);

    // branches and tags are the entries labelled with just their name
    const named = refs.filter((ref) => ref.value !== 'HEAD' && ref.label === ref.value);
    assert.strictEqual(named.length, 20);
  });

  test('keeps a stored commit that scrolled out of the recent list, with its description', async () => {
    for (let i = 0; i < 25; i++) {
      commit(`commit ${i}`);
    }
    const oldestHash = shortHash('HEAD~24');

    const refs = await service.getAvailableRefs(repoDir, [oldestHash]);

    assert.deepStrictEqual(refs.find((ref) => ref.value === oldestHash), {
      value: oldestHash,
      label: `main │ ${oldestHash} │ commit 0`,
    });
  });

  test('does not name the current branch for a stored commit that is not on it', async () => {
    commit('first');
    git('checkout', '-q', '-b', 'other');
    commit('only on other');
    const otherHash = shortHash('HEAD');
    git('checkout', '-q', 'main');

    const refs = await service.getAvailableRefs(repoDir, [otherHash]);

    assert.deepStrictEqual(refs.find((ref) => ref.value === otherHash), {
      value: otherHash,
      label: `${otherHash} │ only on other`,
    });
  });

  test('labels a stored branch that fell outside of the cap by its name', async () => {
    commit('first');
    for (let i = 0; i < 25; i++) {
      git('branch', `feature-${i}`);
    }
    const listed = new Set((await service.getAvailableRefs(repoDir)).map((ref) => ref.value));
    const missing = Array.from({ length: 25 }, (_, i) => `feature-${i}`).find((name) => !listed.has(name));
    assert.ok(missing, 'expected at least one branch outside of the cap');

    const refs = await service.getAvailableRefs(repoDir, [missing]);

    assert.deepStrictEqual(refs.find((ref) => ref.value === missing), { value: missing, label: missing });
  });

  test('drops a stored ref that does not exist', async () => {
    commit('first');

    const refs = await service.getAvailableRefs(repoDir, ['deadbeef', 'no-such-branch']);

    assert.ok(!refs.some((ref) => ref.value === 'deadbeef' || ref.value === 'no-such-branch'));
    assert.deepStrictEqual(warnings, []);
  });

  test('returns nothing, without a warning, for a folder that is not a repository', async () => {
    const notARepository = createTempDir();
    try {
      assert.deepStrictEqual(await service.getAvailableRefs(notARepository), []);
      assert.deepStrictEqual(warnings, []);
    } finally {
      fs.rmSync(notARepository, { recursive: true, force: true });
    }
  });

  test('still warns when git cannot run, since that is not a normal situation', async () => {
    // a missing working directory makes git fail to start
    const refs = await service.getAvailableRefs(path.join(repoDir, 'does-not-exist'));

    assert.deepStrictEqual(refs, []);
    assert.ok(warnings.length > 0);
  });

  test('returns nothing, without a warning, for a repository without commits', async () => {
    // setup() created the repository but no commit yet, so there is no HEAD to name or to list
    assert.deepStrictEqual(await service.getAvailableRefs(repoDir), []);
    assert.deepStrictEqual(warnings, []);
  });
});

suite('GitService.getCommitRange', function () {
  this.timeout(30000);

  let repoDir: string;
  let service: GitService;

  const git = (...args: string[]): string => {
    const output = execFileSync('git', args, { cwd: repoDir, env: GIT_ENV });
    return output.toString().trim();
  };
  const commit = (subject: string) => {
    git('-c', 'commit.gpgsign=false', 'commit', '--allow-empty', '-m', subject);
    return git('rev-parse', 'HEAD');
  };
  const subjectsIn = (range: string) => git('log', '--pretty=%s', range).split('\n')
    .filter(Boolean);

  setup(function () {
    if (!isGitAvailable()) {
      this.skip();
    }

    repoDir = createTempDir();
    git('init', '-q', '-b', 'main');
    service = new GitService({ debug: () => undefined, warn: () => undefined } as unknown as ILoggerService);
  });

  teardown(() => {
    if (repoDir) {
      fs.rmSync(repoDir, { recursive: true, force: true });
    }
  });

  const diverge = () => {
    commit('base');
    git('checkout', '-q', '-b', 'feature');
    commit('feature-1');
    commit('feature-2');
    git('checkout', '-q', 'main');
    commit('main-moved-on');
  };

  test('covers only what the other branch added since the branches diverged', async () => {
    diverge();

    const range = await service.getCommitRange(repoDir, 'main', 'feature');

    assert.deepStrictEqual(subjectsIn(range), ['feature-2', 'feature-1']);
  });

  test('resolves a diverged pair the same way round as it was picked', async () => {
    diverge();

    const range = await service.getCommitRange(repoDir, 'feature', 'main');

    assert.deepStrictEqual(subjectsIn(range), ['main-moved-on']);
  });

  test('swaps the sides when the newer commit was picked first', async () => {
    const older = commit('older');
    commit('newer');

    const range = await service.getCommitRange(repoDir, 'HEAD', older);

    assert.deepStrictEqual(subjectsIn(range), ['newer']);
  });

  test('builds the range from full commit hashes', async () => {
    const older = commit('older');
    const newer = commit('newer');

    assert.strictEqual(await service.getCommitRange(repoDir, older, newer), `${older}..${newer}`);
  });

  test('refuses two refs on the same commit', async () => {
    commit('only');
    git('branch', 'copy');

    await assert.rejects(service.getCommitRange(repoDir, 'main', 'copy'), /same commit/);
  });

  test('refuses histories that share no commit', async () => {
    commit('main-root');
    git('checkout', '-q', '--orphan', 'unrelated');
    commit('unrelated-root');

    await assert.rejects(service.getCommitRange(repoDir, 'main', 'unrelated'), /no common history/);
  });

  test('refuses a revision that does not exist or looks like an option', async () => {
    commit('only');

    await assert.rejects(service.getCommitRange(repoDir, 'main', 'nope'), /Could not find revision "nope"/);
    await assert.rejects(service.getCommitRange(repoDir, 'main', '--output=x'), /not a valid revision/);
  });

  test('reports whether the folder is a git repository', async () => {
    const plainDir = createTempDir();
    try {
      assert.strictEqual(await service.isGitRepository(repoDir), true);
      assert.strictEqual(await service.isGitRepository(plainDir), false);
    } finally {
      fs.rmSync(plainDir, { recursive: true, force: true });
    }
  });

  test('says so when the folder is not a git repository', async () => {
    const plainDir = createTempDir();
    try {
      await assert.rejects(service.getCommitRange(plainDir, 'main', 'dev'), /not a git repository/);
    } finally {
      fs.rmSync(plainDir, { recursive: true, force: true });
    }
  });
});
