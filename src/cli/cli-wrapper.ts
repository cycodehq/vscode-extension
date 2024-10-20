import * as os from 'os';
import * as vscode from 'vscode';
import { CliResult, CliResultError, CliResultPanic, CliResultSuccess } from './models/cli-result';
import { config } from '../utils/config';
import { spawn } from 'child_process';
import { container } from 'tsyringe';
import { ILoggerService } from '../services/logger-service';
import { LoggerServiceSymbol } from '../symbols';
import JSON_ from '../utils/json_';
import { ClassConstructor, plainToInstance } from 'class-transformer';
import { CliError } from './models/cli-error';
import { ExitCode } from './exit-code';
import { CommandParameters } from './constants';
import { getUserAgentArg } from './user-agent';

export class CliWrapper {
  public workDirectory?: string;
  private logger: ILoggerService;

  constructor(workDirectory?: string) {
    this.workDirectory = workDirectory || os.homedir();
    this.logger = container.resolve<ILoggerService>(LoggerServiceSymbol);
  }

  private parseCliResult<T extends ClassConstructor<unknown>>(
    classConst: T | null, out: string, exitCode: number,
  ): CliResult<T> {
    if (classConst == null) {
      // in case when we do not expect any output and want just call command like "ignore" command
      return new CliResultSuccess(null);
    }

    try {
      const cliResult = plainToInstance(classConst, JSON_.parse(out)) as T;
      if (!cliResult) {
        throw new Error('Failed to parse CliResultSuccess');
      }

      return new CliResultSuccess<T>(cliResult);
    } catch {
      this.logger.debug('Failed to parse CliResultSuccess. Parsing CliResultError');

      try {
        const cliError = plainToInstance(CliError, JSON_.parse(out));
        if (!cliError) {
          throw new Error('Failed to parse CliError');
        }

        return new CliResultError(cliError);
      } catch {
        this.logger.debug('Failed to parse any output Returning CliResultPanic');
        return new CliResultPanic(exitCode, out);
      }
    }
  }

  public executeCommand<T extends ClassConstructor<unknown>>(
    classConst: T | null, args: string[], cancellationToken?: vscode.CancellationToken,
  ): Promise<CliResult<T>> {
    const defaultCliArgs = [CommandParameters.OutputFormatJson, getUserAgentArg()];
    const commandParams = [...config.additionalParams, ...defaultCliArgs, ...args];

    const executedCommand = `${config.cliPath} ${commandParams.join(' ')}`;
    this.logger.debug(`Running command: "${executedCommand}"`);

    const childProcess = spawn(config.cliPath, commandParams, {
      cwd: this.workDirectory,
      env: {
        ...process.env,
        ...config.cliEnv,
      },
      shell: true,
    });

    let exitCode = 0;
    let stderr = '';
    let stdout = '';

    return new Promise((resolve) => {
      /*
       * see the difference between close and exit event here:
       * https://nodejs.org/api/child_process.html#event-close
       */

      cancellationToken?.onCancellationRequested(() => {
        this.logger.debug(`Killing child process: "${executedCommand}"`);
        childProcess.kill('SIGINT');
        resolve(new CliResultPanic(ExitCode.TERMINATION, 'Command has been cancelled'));
      });

      childProcess.on('exit', (code: number) => {
        // exit occurs earlier than close
        this.logger.debug(`Command exited with code: ${code}`);
        exitCode = code;
      });

      childProcess.on('close', (code: number) => {
        // we receive all "data" events before close
        this.logger.debug(`Streams of a command have been closed with code: ${code}`);
        resolve(this.parseCliResult(classConst, stdout, exitCode));
      });

      childProcess.on('error', (error: { errno: number }) => {
        resolve(this.parseCliResult(classConst, stderr, error.errno));
      });

      childProcess.stdout.on('data', (data) => {
        this.logger.debug(`Command stdout: ${data.toString()}`);

        if (!data) {
          return;
        }

        stdout += data.toString();
      });

      childProcess.stderr.on('data', (data) => {
        this.logger.debug(`Command stderr: ${data.toString()}`);

        if (!data) {
          return;
        }

        stderr += data.toString();
      });
    });
  }
}
