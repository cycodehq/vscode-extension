import * as assert from 'assert';
import * as fs from 'fs';
import * as path from 'path';
import { CliWrapper } from '../../cli/cli-wrapper';
import { CommandParameters } from '../../cli/constants';
import { resetVscodeMock, settings } from '../vscode-mock';
import { createTempDir, LoggerMock, registerExtensionPath, registerLoggerMock } from '../helpers';

const SECRET = 'cycode-test-secret-value-1234567890';

/*
 * fake CLI: saves received argv to a file, prints the secret to stdout and stderr.
 * stdout is a valid JSON, so it doesn't end up in the error messages
 */
const FAKE_CLI_SOURCE = `#!${process.execPath}
require('fs').writeFileSync(process.env.ARGV_OUTPUT, JSON.stringify(process.argv.slice(2)));
process.stdout.write(JSON.stringify({ secret: '${SECRET}' }));
process.stderr.write('stderr diagnostics: ${SECRET}');
`;

suite('CliWrapper', () => {
  let tempDir: string;
  let argvOutputPath: string;
  let logger: LoggerMock;

  setup(() => {
    resetVscodeMock();
    logger = registerLoggerMock();
    tempDir = createTempDir();
    registerExtensionPath(tempDir);

    const fakeCliPath = path.join(tempDir, 'fake cli');
    fs.writeFileSync(fakeCliPath, FAKE_CLI_SOURCE, { mode: 0o755 });
    settings.cliPath = fakeCliPath;

    // the CLI process inherits the environment of the extension
    argvOutputPath = path.join(tempDir, 'argv.json');
    process.env.ARGV_OUTPUT = argvOutputPath;
  });

  teardown(() => {
    delete process.env.ARGV_OUTPUT;
    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  const readArgv = (): string[] => JSON.parse(fs.readFileSync(argvOutputPath, 'utf8'));

  test('passes paths with spaces and shell metacharacters as is, without a shell', async function () {
    if (process.platform === 'win32') {
      // the fake CLI is a script with a shebang
      this.skip();
    }

    const workDirectory = path.join(tempDir, 'work dir');
    fs.mkdirSync(workDirectory);

    const paths = [
      path.join(tempDir, 'my project', 'file with spaces.ts'),
      path.join(tempDir, '$(touch pwned)', 'a.ts'),
      path.join(tempDir, '`touch pwned2`;touch pwned3', 'it\'s "quoted".ts'),
    ];
    await new CliWrapper(workDirectory).executeCommand(null, ['scan', 'path', ...paths]);

    const argv = readArgv();
    assert.deepStrictEqual(argv.slice(-paths.length), paths);
    assert.deepStrictEqual(argv.slice(0, 2), [CommandParameters.OutputFormatJson, argv[1]]);

    for (const file of ['pwned', 'pwned2', 'pwned3']) {
      assert.strictEqual(fs.existsSync(path.join(workDirectory, file)), false, `${file} must not be created`);
    }
  });

  test('passes the user agent as a single valid JSON argument', async function () {
    if (process.platform === 'win32') {
      this.skip();
    }

    await new CliWrapper(tempDir).executeCommand(null, ['status']);

    const userAgentArg = readArgv().find((arg) => arg.startsWith(`${CommandParameters.UserAgent}=`));
    assert.ok(userAgentArg);
    const userAgent = JSON.parse(userAgentArg.slice(`${CommandParameters.UserAgent}=`.length));
    assert.strictEqual(userAgent.env_name ?? userAgent.envName, 'vscode');
  });

  test('does not log stdout, stderr and sensitive arguments verbatim', async function () {
    if (process.platform === 'win32') {
      this.skip();
    }

    settings.additionalParameters = `--api-token ${SECRET}`;
    await new CliWrapper(tempDir).executeCommand(null, ['ignore', '-t', 'secret', '--by-value', SECRET]);

    assert.ok(fs.existsSync(argvOutputPath), 'the fake CLI must be executed');
    assert.ok(logger.messages.some((message) => message.includes('stderr: received')));
    for (const message of logger.messages) {
      assert.ok(!message.includes(SECRET), `the secret is logged: ${message}`);
    }
  });
});
