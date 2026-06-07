import { createInterface } from "node:readline/promises";
import { stdin as input, stdout as output } from "node:process";
import { openPersistentBrowser, requestJson, saveAuthState } from "../../../../packages/connectors/src/browser.js";

interface SposLoginStatus {
  data?: {
    loggedIn?: boolean;
    username?: string | null;
    personName?: string | null;
  };
}

async function main(): Promise<void> {
  const session = await openPersistentBrowser({ headless: false });
  const rl = createInterface({ input, output });
  let lastMessage = "";
  let stopped = false;

  async function checkSpos(): Promise<boolean> {
    try {
      const status = await requestJson<SposLoginStatus>(
        session.context,
        "spos",
        "spos.authCheck",
        "https://spos.lenovo.com.cn/spos-metadata/loginStatus",
      );
      if (status.data?.loggedIn) {
        const user = status.data.personName ?? status.data.username ?? "unknown user";
        const message = `SPOS 登录态已检测到：${user}`;
        if (message !== lastMessage) console.log(message);
        lastMessage = message;
        return true;
      }
    } catch {
      // Keep polling while the user is still navigating through SDI/SPOS.
    }

    const pages = session.context.pages().map((page) => page.url()).filter(Boolean);
    const message = `尚未检测到 SPOS 登录态。当前受控浏览器页面：${pages.join(" | ")}`;
    if (message !== lastMessage) console.log(message);
    lastMessage = message;
    return false;
  }

  try {
    const serviceforce = session.page;
    await serviceforce.goto("https://serviceforce.lenovo.com.cn/#/home-page", {
      waitUntil: "domcontentloaded",
      timeout: 60_000,
    });

    console.log("已打开服务云。请手动点击 SDI，再在 SDI 中点击 SPOS。");
    console.log("保持在本命令打开的浏览器里操作。检测到 SPOS 登录态后，回到终端按 Enter 结束。");
    const timer = setInterval(() => {
      if (!stopped) void checkSpos();
    }, 3000);
    await rl.question("");
    stopped = true;
    clearInterval(timer);

    if (await checkSpos()) {
      const statePath = await saveAuthState(session.context);
      console.log(`登录态快照已保存：${statePath}`);
    } else {
      console.log("SPOS 登录态未保存。请确认 SPOS 页面是在本命令打开的受控浏览器中进入，且页面没有显示“请先登录”。");
      process.exitCode = 2;
    }
  } finally {
    rl.close();
    await session.close();
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
