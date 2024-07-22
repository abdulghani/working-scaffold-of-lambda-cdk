import { spawnSync } from "child_process";

function printGrey(text: string) {
  return `\x1b[1;30m${text}\x1b[0m`;
}

function runScript(script: string) {
  const _p = spawnSync(script, {
    shell: true,
    cwd: process.cwd()
  });
  _p.output.forEach((o) => o && console.log(printGrey(o.toString())));
  if (_p.status !== 0) {
    throw new Error("Migration failed");
  }
}

export function setup() {
  runScript("npm run test:prepare");
  runScript(
    "./node_modules/.bin/tsx ./node_modules/.bin/knex --knexfile ./knexfile.ts migrate:latest --env test"
  );
}

export function teardown() {
  runScript(
    "./node_modules/.bin/tsx ./node_modules/.bin/knex --knexfile ./knexfile.ts migrate:rollback --all --env test"
  );
  runScript("npm run test:stop");
}
