import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { openPersistentBrowser } from "../../../../packages/connectors/src/browser.js";
import { runSop1 } from "../../../../packages/workflow-core/src/sop1.js";

function readWorkOrderNo(): string {
  const directArg = process.argv.find((arg) => /^\d{10,}$/.test(arg));
  const flagIndex = process.argv.findIndex((arg) => arg === "--work-order-no" || arg === "-w");
  const flagValue = flagIndex >= 0 ? process.argv[flagIndex + 1] : undefined;
  const value = flagValue ?? directArg;
  if (!value) {
    throw new Error("请传入工单号，例如：npm run sop1 -- --work-order-no 202604273400100002");
  }
  return value;
}

async function main(): Promise<void> {
  const workOrderNo = readWorkOrderNo();
  const session = await openPersistentBrowser({ headless: true });
  try {
    const result = await runSop1(session.context, { work_order_no: workOrderNo });
    const runDir = path.resolve(process.cwd(), "runs", `sop1-${workOrderNo}-${Date.now()}`);
    await mkdir(runDir, { recursive: true });
    await writeFile(path.join(runDir, "result.json"), JSON.stringify(result, null, 2), "utf-8");
    console.log(JSON.stringify(result, null, 2));
    console.log(`\n结果已保存：${path.join(runDir, "result.json")}`);
  } finally {
    await session.close();
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
