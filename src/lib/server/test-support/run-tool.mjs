// Compile explicit maintenance tools with the existing TypeScript compiler; no new dependency.
import ts from "typescript";
import { config } from "dotenv";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { resolve, join } from "node:path";
import { spawnSync } from "node:child_process";

config({ quiet: true }); // Reads ignored .env without printing configuration or keys.
const root = process.cwd();
const tasks = {
  questions: { source: "src/lib/questions/generator.ts", compiled: "lib/questions/generator.js", method: "generateToFile" },
  speech: { source: "src/lib/server/speech/generate.ts", compiled: "lib/server/speech/generate.js", method: "generateToFile" },
  smoke: { source: "src/lib/server/test-support/smoke.ts", compiled: "lib/server/test-support/smoke.js", method: "run" },
};
const task = tasks[process.argv[2]];
if (!task) throw new Error("Choose the questions, speech or smoke maintenance task.");
const output = mkdtempSync(join(tmpdir(), "synapse-static-translations-"));
try {
  const configFile = ts.readConfigFile(resolve(root, "tsconfig.json"), ts.sys.readFile);
  const parsed = ts.parseJsonConfigFileContent(configFile.config, ts.sys, root);
  const program = ts.createProgram([resolve(root, task.source)], {
    ...parsed.options, module: ts.ModuleKind.CommonJS, moduleResolution: ts.ModuleResolutionKind.Node10,
    rootDir: resolve(root, "src"), outDir: output, noEmit: false, noEmitOnError: true,
    incremental: false, isolatedModules: false, plugins: [],
  });
  const diagnostics = [...parsed.errors, ...ts.getPreEmitDiagnostics(program)];
  if (diagnostics.length) {
    process.stderr.write(ts.formatDiagnosticsWithColorAndContext(diagnostics, {
      getCanonicalFileName: (file) => file, getCurrentDirectory: () => root, getNewLine: () => "\n",
    }));
    process.exitCode = 1;
  } else if (program.emit().emitSkipped) process.exitCode = 1;
  else {
    const result = spawnSync(process.execPath, ["-e",
      'require(process.argv[1])[process.argv[2]](process.argv.slice(3)).catch((error) => { const safe = new Set(["Translation provider is unavailable.", "Generated question IDs do not match the source.", "Generated answer IDs do not match the source.", "Generated text changed numeric values.", "Generated text contains an unexpected writing system."]); console.error(safe.has(error.message) ? error.message : "Maintenance task failed validation."); console.error("No request or response content was logged; complete static packs are preserved."); process.exitCode = 1; })',
      join(output, task.compiled), task.method, ...process.argv.slice(3),
    ], { stdio: "inherit", env: { ...process.env, NODE_PATH: resolve(root, "node_modules") } });
    process.exitCode = result.status ?? 1;
  }
} finally {
  rmSync(output, { recursive: true, force: true });
}
