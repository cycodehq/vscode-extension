import { CommandResult } from "./types";
import { ChildProcess, spawn } from "child_process";

let childProcess: ChildProcess | undefined = undefined;

const parseJsonResult = (
  code: number,
  stderr: string,
  stdout: string
): CommandResult => {
  const resultObj = {
    exitCode: code,
    error: stderr,
    result: {},
  };

  if (stdout) {
    const resultObject = JSON.parse(stdout);
    resultObj.result = resultObject;
  }

  return resultObj;
};

export const runCli = (
  cliPath: string,
  params: string[]
): Promise<CommandResult> => {
  console.log("Running command: ", cliPath, params.join(" "));

  return new Promise((resolve, reject) => {
    let stderr = "";
    let stdout = "";

    childProcess = spawn(cliPath, params, {
      env: {
        ...process.env,
      },
    });

    childProcess.on("exit", (code: number) => {
      if (code === 1) {
        stderr = stdout;
      }
      const result = parseJsonResult(code, stderr, stdout);
      resolve(result);
    });

    childProcess.on("error", (error) => {
      if (error) {
        stderr += error.toString();
      }
      reject();
    });

    childProcess.stdout?.on("data", (data) => {
      if (data) {
        stdout += data.toString();
      }
    });

    childProcess.stderr?.on("data", (data) => {
      if (data) {
        stderr += data.toString();
      }
    });
  });
};
