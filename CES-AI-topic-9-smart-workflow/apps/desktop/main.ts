import { mkdir } from "node:fs/promises";
import type http from "node:http";
import net from "node:net";
import path from "node:path";
import { app, BrowserWindow, dialog } from "electron";

let apiServer: http.Server | null = null;

async function findFreePort(): Promise<number> {
  return await new Promise((resolve, reject) => {
    const server = net.createServer();
    server.once("error", reject);
    server.listen(0, "127.0.0.1", () => {
      const address = server.address();
      server.close(() => {
        if (address && typeof address === "object") resolve(address.port);
        else reject(new Error("Unable to allocate API port"));
      });
    });
  });
}

async function startApi(): Promise<number> {
  const port = await findFreePort();
  const appPath = app.getAppPath();
  const userDataDir = app.getPath("userData");
  const configDir = path.join(userDataDir, "config");
  const secretsDir = path.join(userDataDir, "secrets");
  const logsDir = path.join(userDataDir, "logs");
  const webDistDir = app.isPackaged ? path.join(process.resourcesPath, "web") : path.join(appPath, "apps/web/dist");

  await Promise.all([
    mkdir(configDir, { recursive: true }),
    mkdir(secretsDir, { recursive: true }),
    mkdir(logsDir, { recursive: true }),
  ]);

  process.env.PORT = String(port);
  process.env.WEB_DIST_DIR = webDistDir;
  process.env.APP_DATA_DIR = userDataDir;
  process.env.AUTH_PROFILE_DIR = path.join(secretsDir, "browser-profile");
  process.env.AUTH_STATE_PATH = path.join(secretsDir, "auth-state.json");
  process.env.DOTENV_CONFIG_PATH = path.join(configDir, "app.env");

  const { startApiServer } = await import("../api/src/server.js");
  apiServer = await startApiServer(port);
  return port;
}

async function createWindow(port: number): Promise<void> {
  const win = new BrowserWindow({
    width: 1440,
    height: 920,
    minWidth: 1180,
    minHeight: 760,
    title: "CES AI Smart Workflow",
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  await win.loadURL(`http://127.0.0.1:${port}/`);
}

app.whenReady().then(async () => {
  try {
    const port = await startApi();
    await createWindow(port);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    await dialog.showMessageBox({ type: "error", title: "启动失败", message });
    app.quit();
  }
});

app.on("window-all-closed", () => {
  app.quit();
});

app.on("before-quit", () => {
  apiServer?.close();
});
