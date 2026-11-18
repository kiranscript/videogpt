import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { loadEvaluationCases } from "@/lib/evaluation/cases";
import { classifyProjectDiagnostics } from "@/lib/evaluation/diagnostics";
import { generateComposedVideo } from "@/lib/generation/composedVideo";
async function evaluate() {
const output = join(process.cwd(), "evaluation-artifacts", new Date().toISOString().replaceAll(":", "-"));
await mkdir(output, { recursive: true });
for (const item of loadEvaluationCases()) {
  const started = Date.now();
  try {
    const result = await generateComposedVideo(item);
    await writeFile(join(output, `${item.id}.json`), JSON.stringify({ case: item, model: process.env.DEFAULT_MODEL, timestamp: new Date().toISOString(), elapsedMs: Date.now() - started, project: result.project, diagnostics: classifyProjectDiagnostics(result.project) }, null, 2));
    console.log(`${item.id}: saved`);
  } catch (error) {
    process.exitCode = 1;
    await writeFile(join(output, `${item.id}.error.json`), JSON.stringify({ case: item, error: String(error) }, null, 2));
    console.error(`${item.id}: failed`);
  }
}
console.log(`Artifacts: ${output}`);

}
void evaluate().catch((error: unknown) => { console.error(error); process.exitCode = 1; });
