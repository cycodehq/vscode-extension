import {spawn} from 'child_process';
import * as os from 'os';
import {extensionOutput} from '../logging/extension-output';
import {CommandResult, RunCliArgs, RunCliResult} from './types';

const parseResult = (out: string): object => {
  let result = {};
  try {
    if (out) {
      result = JSON.parse(out);
    }
  } catch (error) {
    result = {data: out};
  }

  return result;
};

export const getRunnableCliCommand = (args: RunCliArgs): RunCliResult => {
  const {
    cliPath,
    cliEnv,
    commandParams,
    workspaceFolderPath,
    printToOutput,
  } = args;

  extensionOutput.info(
      `Running command: "${cliPath} ${commandParams.join(' ')}"`
  );

  const childProcess = spawn(cliPath, commandParams, {
    cwd: workspaceFolderPath || os.homedir(),
    env: {
      ...process.env,
      ...cliEnv,
    },
    shell: true,
  });

  const getCancelPromise = () => new Promise<void>((resolve) => {
    extensionOutput.info(
        `Killing child process: "${cliPath} ${commandParams.join(' ')}"`
    );

    childProcess.kill('SIGINT');
    resolve();
  });

  const getResultPromise = () => new Promise<CommandResult>((resolve) => {
    let exitCode = 0;
    let stderr = '';
    let stdout = '';

    const handleErrorOutput: (chunk: any) => void = (data) => {
      if (!data) {
        return;
      }
      stderr += data.toString();
      if (printToOutput) {
        extensionOutput.debug(data.toString());
      }
    };

    // see the difference between close and exit event here:
    // https://nodejs.org/api/child_process.html#event-close

    childProcess.on('exit', (code: number) => {
      // exit occurs earlier than close
      extensionOutput.debug(`Command exited with code: ${code}`);
      exitCode = code;
    });

    childProcess.on('close', (code: number) => {
      // we receive all "data" events before close
      extensionOutput.debug(`Streams of a command have been closed with code: ${code}`);
      resolve({
        exitCode: exitCode,
        stderr: stderr,
        result: parseResult(stdout),
      });
    });

    childProcess.on('error', (error: { errno: number }) => {
      handleErrorOutput(error);
      resolve({
        exitCode: error.errno,
        stderr: stderr,
        result: parseResult(stderr),
      });
    });

    childProcess.stdout?.on('data', (data) => {
      if (printToOutput) {
        extensionOutput.info(`Command stdout: ${data.toString()}`);
      }

      if (!data) {
        return;
      }

      stdout += data.toString();
    });

    childProcess.stderr?.on('data', handleErrorOutput);
  });

  return {getCancelPromise: getCancelPromise, getResultPromise: getResultPromise};
};
