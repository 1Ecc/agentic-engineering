import { openPersistentBrowser, requestJson } from "../../../../packages/connectors/src/browser.js";

async function main(): Promise<void> {
  const session = await openPersistentBrowser({ headless: true });
  try {
    const checks = [
      ["serviceforce", "serviceforce.authCheck", "https://serviceforce.lenovo.com.cn/orgauthorityapi/authUser/getUserDetail?_t=" + Date.now()],
      ["jiuqiu", "jiuqiu.authCheck", "https://jiuqiu.lenovo.com.cn/base/user?_t=" + Date.now()],
      ["spos", "spos.authCheck", "https://spos.lenovo.com.cn/spos-metadata/loginStatus"],
    ] as const;

    const results = [];
    for (const [platform, step, url] of checks) {
      try {
        const data = await requestJson<Record<string, unknown>>(session.context, platform, step, url);
        results.push({ platform, ok: true, data });
      } catch (error) {
        results.push({
          platform,
          ok: false,
          error: error instanceof Error ? error.message : String(error),
        });
      }
    }

    console.log(JSON.stringify(results, null, 2));
  } finally {
    await session.close();
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
