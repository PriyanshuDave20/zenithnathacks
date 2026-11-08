// Use the existing TypeScript compiler and Node test runner; no test dependency.
import ts from "typescript";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { resolve, join } from "node:path";
import { spawnSync } from "node:child_process";

const root = process.cwd();
const output = mkdtempSync(join(tmpdir(), "synapse-foundation-tests-"));
const tests = [
  "src/lib/contracts/contracts.test.ts",
  "src/lib/questions/questions.test.ts",
  "src/lib/questions/localization.test.ts",
  "src/lib/input/body-parts.test.ts",
  "src/lib/input/gaze/gaze-math.test.ts",
  "src/lib/input/gaze/dwell.test.ts",
  "src/lib/server/redact.test.ts",
  "src/lib/server/llm.test.ts",
  "src/lib/server/providers/nvidia.test.ts",
  "src/lib/server/translate/translate.test.ts",
  "src/app/api/translate/route.test.ts",
  "src/lib/server/respond/respond.test.ts",
  "src/app/api/respond/route.test.ts",
  "src/components/session/api.test.ts",
];

try {
  const config = ts.readConfigFile(resolve(root, "tsconfig.json"), ts.sys.readFile);
  if (config.error) throw new Error(ts.flattenDiagnosticMessageText(config.error.messageText, "\n"));
  const parsed = ts.parseJsonConfigFileContent(config.config, ts.sys, root);
  const program = ts.createProgram(tests.map((path) => resolve(root, path)), {
    ...parsed.options,
    module: ts.ModuleKind.CommonJS,
    moduleResolution: ts.ModuleResolutionKind.Node10,
    rootDir: resolve(root, "src"),
    outDir: output,
    noEmit: false,
    noEmitOnError: true,
    incremental: false,
    isolatedModules: false,
    plugins: [],
  });
  const diagnostics = [...parsed.errors, ...ts.getPreEmitDiagnostics(program)];
  if (diagnostics.length) {
    process.stderr.write(ts.formatDiagnosticsWithColorAndContext(diagnostics, {
      getCanonicalFileName: (file) => file,
      getCurrentDirectory: () => root,
      getNewLine: () => "\n",
    }));
    process.exitCode = 1;
  } else if (program.emit().emitSkipped) {
    process.exitCode = 1;
  } else {
    const result = spawnSync(process.execPath, ["--test", ...tests.map((path) =>
      join(output, path.replace(/^src\//, "").replace(/\.ts$/, ".js")))], {
      stdio: "inherit",
      // Compiled tests live outside the repo; resolve installed dependencies here.
      env: { ...process.env, NODE_PATH: resolve(root, "node_modules") },
    });
    if (result.error) throw result.error;
    process.exitCode = result.status ?? 1;
  }
} finally {
  rmSync(output, { recursive: true, force: true });
}
