import { ChildProcess, spawn } from "child_process";
import * as os from "os";
import { extensionOutput } from "../logging/extension-output";
import { CommandResult } from "./types";

interface RunCliArgs {
  cliPath: string;
  cliEnv: { [key: string]: string };
  commandParams: string[];
  workspaceFolderPath?: string;
  printToOutput?: boolean;
}

let childProcess: ChildProcess | undefined = undefined;

const parseResult = (out: string): object => {
  let result = {};
  try {
    if (out) {
      result = JSON.parse(out);
    }
  } catch (error) {
    result = { data: out };
  }

  return result;
};

export const runCli = (args: RunCliArgs): Promise<CommandResult> => {
  const { cliPath, cliEnv, commandParams, workspaceFolderPath, printToOutput } =
    args;

  extensionOutput.info(
    `Running command: "${cliPath} ${commandParams.join(" ")}"`
  );

  return new Promise((resolve, _) => {
    let stderr = "";
    let stdout = "";

    const handleErrorOutput: (chunk: any) => void = (data) => {
      if (!data) {
        return;
      }
      stderr += data.toString();
      if (printToOutput) {
        extensionOutput.error(data.toString());
      }
    };

    childProcess = spawn(cliPath, commandParams, {
      cwd: workspaceFolderPath || os.homedir(),
      env: {
        ...process.env,
        ...cliEnv,
      },
      shell: true,
    });

    childProcess.on("exit", (code: number) => {
      extensionOutput.info(`Command exited with code: ${code}`);
      resolve({
        exitCode: code,
        stderr: stderr,
        result: parseResult(stdout),
      });
    });

    childProcess.on("error", (error: { errno: number }) => {
      handleErrorOutput(error);
      resolve({
        exitCode: error.errno,
        stderr: stderr,
        result: parseResult(stderr),
      });
    });

    childProcess.stdout?.on("data", (data) => {
      if (printToOutput) {
        extensionOutput.info(`Command stdout: ${data.toString()}`);
      }

      if (!data) {
        return;
      }

      stdout += data.toString();
    });

    childProcess.stderr?.on("data", handleErrorOutput);
  });
};
