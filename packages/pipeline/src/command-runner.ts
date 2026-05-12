import { spawn } from "node:child_process";

export type CommandResult = {
  stdout: string;
  stderr: string;
  exitCode: number;
};

export type CommandRunnerOptions = {
  timeoutMs: number;
  env?: NodeJS.ProcessEnv;
};

export class CommandExecutionError extends Error {
  constructor(
    message: string,
    readonly result?: CommandResult,
  ) {
    super(message);
  }
}

export class CommandRunner {
  constructor(private readonly options: CommandRunnerOptions) {}

  run(binary: string, args: string[], cwd?: string): Promise<CommandResult> {
    return new Promise((resolve, reject) => {
      const child = spawn(binary, args, {
        cwd,
        env: { ...process.env, ...this.options.env },
        shell: false,
        stdio: ["ignore", "pipe", "pipe"],
      });

      let stdout = "";
      let stderr = "";
      let settled = false;

      const timeout = setTimeout(() => {
        if (!settled) {
          child.kill("SIGTERM");
          settled = true;
          reject(new CommandExecutionError(`Command timed out: ${binary}`));
        }
      }, this.options.timeoutMs);

      child.stdout.setEncoding("utf8");
      child.stderr.setEncoding("utf8");
      child.stdout.on("data", (chunk: string) => {
        stdout += chunk;
      });
      child.stderr.on("data", (chunk: string) => {
        stderr += chunk;
      });
      child.on("error", (error) => {
        if (!settled) {
          settled = true;
          clearTimeout(timeout);
          reject(error);
        }
      });
      child.on("close", (exitCode) => {
        if (settled) {
          return;
        }

        settled = true;
        clearTimeout(timeout);
        const result = { stdout, stderr, exitCode: exitCode ?? 1 };
        if (result.exitCode !== 0) {
          reject(new CommandExecutionError(`Command failed: ${binary}`, result));
          return;
        }

        resolve(result);
      });
    });
  }
}
