// Production navigation/prefetching, without dev compilation on every new route.
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";

const cli = fileURLToPath(new URL("../node_modules/next/dist/bin/next", import.meta.url));
const env = { ...process.env, NEXT_BUILD_DIR: ".next-demo" };
function run(args) {
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, [cli, ...args], { env, stdio: "inherit" });
    child.on("error", reject);
    child.on("exit", (code) => resolve(code ?? 1));
  });
}
const build = await run(["build"]);
process.exitCode = build || await run(["start", "--port", process.env.PORT || "3000"]);
