import { ChildProcess, spawn } from "child_process";
import * as os from "os";
import { extensionOutput } from "../logging/extension-output";
import { CommandResult } from "./types";

let childProcess: ChildProcess | undefined = undefined;

const parseResult = (stdout: string): string | object => {
  let result = {};
  try {
    if (stdout) {
      result = JSON.parse(stdout);
    }
  } catch (error) {
    result = { data: stdout };
  }

  return result;
};

export const runCli = (
  cliPath: string,
  workspaceFolderPath: string,
  params: string[],
  env: { [key: string]: string },
  printToOutput: boolean = false
): Promise<CommandResult> => {
  console.log("Running command: ", cliPath, params.join(" "));
  return new Promise((resolve, reject) => {
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

    childProcess = spawn(cliPath, params, {
      cwd: workspaceFolderPath || os.homedir(),
      env: {
        ...process.env,
        ...env,
      },
    });

    childProcess.on("exit", (code: number) => {
      resolve({
        exitCode: code,
        error: stderr,
        result: parseResult(stdout),
      });
    });

    childProcess.on("error", (error: { errno: number }) => {
      handleErrorOutput(error);

      resolve({
        exitCode: error.errno,
        error: stderr,
        result: parseResult(stderr),
      });
    });

    childProcess.stdout?.on("data", (data) => {
      if (!data) {
        return;
      }
      stdout += data.toString();
      if (printToOutput) {
        extensionOutput.info(data.toString());
      }
    });

    childProcess.stderr?.on("data", handleErrorOutput);
  });
};
