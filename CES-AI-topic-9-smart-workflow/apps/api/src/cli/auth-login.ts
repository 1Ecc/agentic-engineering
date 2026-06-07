import { createInterface } from "node:readline/promises";
import { stdin as input, stdout as output } from "node:process";
import { openPersistentBrowser, saveAuthState } from "../../../../packages/connectors/src/browser.js";

const LOGIN_URLS = [
  "https://serviceforce.lenovo.com.cn/#/home-page",
  "https://jiuqiu.lenovo.com.cn/#/index",
];

async function main(): Promise<void> {
  const session = await openPersistentBrowser({ headless: false });
  const rl = createInterface({ input, output });

  try {
    for (const url of LOGIN_URLS) {
      const page = await session.context.newPage();
      await page.goto(url, { waitUntil: "domcontentloaded", timeout: 60_000 }).catch(() => undefined);
    }

    console.log("已打开登录浏览器。请完成以下操作：");
    console.log("1. 登录服务云。");
    console.log("2. 登录九丘。");
    console.log("3. 回到服务云，点击 SDI，再在 SDI 中点击 SPOS，直到成功进入 SPOS 页面。");
    console.log("全部完成后回到终端按 Enter，登录态会保存在 secrets/browser-profile/。");
    await rl.question("");
    const statePath = await saveAuthState(session.context);
    console.log(`登录态快照已保存：${statePath}`);
  } finally {
    rl.close();
    await session.close();
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
