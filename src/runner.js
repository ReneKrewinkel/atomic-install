import { spawn } from "node:child_process";

export const formatCommand = (command, args) =>
  [command, ...args]
    .map((value) =>
      /[\s"]/u.test(value) ? JSON.stringify(value) : value,
    )
    .join(" ");

export const runCommand = (
  command,
  args,
  { cwd = process.cwd(), env = process.env, input } = {},
) =>
  new Promise((resolve, reject) => {
    console.log(`\n> ${formatCommand(command, args)}`);

    const child = spawn(command, args, {
      cwd,
      env,
      shell: false,
      stdio: [input === undefined ? "inherit" : "pipe", "inherit", "inherit"],
    });

    child.on("error", reject);
    child.on("close", (code, signal) => {
      if (code === 0) {
        resolve();
        return;
      }

      const detail = signal ? `signal ${signal}` : `exit code ${code}`;
      reject(new Error(`${command} failed with ${detail}.`));
    });

    if (input !== undefined) {
      child.stdin.end(input);
    }
  });
