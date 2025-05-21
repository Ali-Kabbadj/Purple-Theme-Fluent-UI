import { CustomUiSidebarProvider } from "../../ui/sidebar/sidebar";
import * as fs from "fs";
import * as path from "path";
import { messageHandler } from "../messages";
import * as vscode from "vscode";
import { VSCodeCustomCssConfig } from "./types";
import { helper } from "../commands/Helper";

interface GlobalThis {
  _VSCODE_FILE_ROOT?: string;
}

declare const globalThis: GlobalThis;

type Globals = {
  app_dir: string | undefined;
  vs_code_base: string | undefined;
  sidebarProvider: CustomUiSidebarProvider | undefined;
  // htmlFile: fs.PathLike | fs.promises.FileHandle | undefined;
  htmlFile: fs.PathLike | undefined;
  context: vscode.ExtensionContext | undefined;
  extentionConfig: VSCodeCustomCssConfig | undefined;
  globalGlobalThis: GlobalThis;
  init: (context: vscode.ExtensionContext) => void;
  isCustomCssJSInstalled: () => Promise<boolean>;
};

export const globals: Globals = {
  context: undefined,
  app_dir: undefined,
  vs_code_base: undefined,
  htmlFile: undefined,
  extentionConfig: undefined,
  sidebarProvider: undefined,
  globalGlobalThis: globalThis,
  init(context: vscode.ExtensionContext) {
    console.info("Initializing globals...");

    // 1 - context
    this.context = context;

    // 2 - appdir
    this.app_dir = require.main
      ? path.dirname(require.main.filename)
      : globalThis._VSCODE_FILE_ROOT;
    if (!this.app_dir) {
      async () => {
        await messageHandler.promptLocatePathFailure();
      };
      return;
    }
    console.info("app_dir initialized:", this.htmlFile);

    // 3 - base vscode url
    this.vs_code_base = path.join(this.app_dir as string, "vs", "code");
    this.htmlFile = path.join(
      this.vs_code_base,
      "electron-sandbox",
      "workbench",
      "workbench.html",
    );
    console.info("vscode url initialized:", this.htmlFile);

    // 4 - workbench html
    if (!fs.existsSync(this.htmlFile)) {
      this.htmlFile = path.join(
        this.vs_code_base,
        "electron-sandbox",
        "workbench",
        "workbench-apc-extension.html",
      );
    }
    if (!fs.existsSync(this.htmlFile)) {
      this.htmlFile = path.join(
        this.vs_code_base,
        "electron-sandbox",
        "workbench",
        "workbench.esm.html",
      );
    }
    if (!fs.existsSync(this.htmlFile)) {
      async () => {
        await messageHandler.promptLocatePathFailure();
      };
    }
    console.info("workbench html initialized:", this.htmlFile);

    //  5 - Extention Config
    // const extensionUri = vscode.extensions.getExtension(
    //   "Ali-Kabbadj.theme-editor-pro",
    // )?.extensionUri;
    // if (!extensionUri) {
    //   vscode.window.showErrorMessage("Could not locate extension URI");
    //   return;
    // }
    // const cssUri = path.join(
    //   extensionUri.fsPath,
    //   "resources",
    //   "customs",
    //   "custom.css",
    // );
    // const jsUri = path.join(
    //   extensionUri.fsPath,
    //   "resources",
    //   "customs",
    //   "custom.js",
    // );
    // this.extentionConfig = {
    //   imports: [cssUri, jsUri],
    //   extensionUri: extensionUri,
    //   cssUri: cssUri,
    //   jsUri: jsUri,
    // };
    helper.UpdateConfigFiles();
    console.info("config initialized:", this.extentionConfig);

    // 6 - register sidebar
    this.sidebarProvider = new CustomUiSidebarProvider(context);
    context.subscriptions.push(
      vscode.window.registerWebviewViewProvider(
        "customUiSidebar",
        this.sidebarProvider,
        {
          webviewOptions: {
            retainContextWhenHidden: true,
          },
        },
      ),
    );
    if (this.extentionConfig) {
      this.sidebarProvider.updatePaths(
        this.extentionConfig.cssUri,
        this.extentionConfig.jsUri,
      );
      this.isCustomCssJSInstalled().then((isInstalled: boolean) => {
        this.sidebarProvider?.updateStatus(isInstalled);
      });
    }
    if (this.sidebarProvider && this.extentionConfig) {
      this.sidebarProvider.updatePaths(
        this.extentionConfig.cssUri,
        this.extentionConfig.jsUri,
      );
    }
    console.info("sidebarProvider initialized:", this.extentionConfig);

    // 7 - init custom css/js watcher
    if (this.extentionConfig) {
      try {
        fs.watch(
          this.extentionConfig.cssUri,
          { encoding: "utf-8" },
          (eventType, filename) => {
            console.log(`[watcher] (${filename}) changed (${eventType})`);
            vscode.commands.executeCommand(
              "theme-editor-pro.updateCssJsInjection",
            );
          },
        );
        fs.watch(
          this.extentionConfig.jsUri,
          { encoding: "utf-8" },
          (eventType, filename) => {
            console.log(`[watcher] (${filename}) changed (${eventType})`);
            vscode.commands.executeCommand(
              "theme-editor-pro.updateCssJsInjection",
            );
          },
        );
        console.log("Custom CSS/JS file watcher initialized...");
      } catch (err) {
        // logger.error("😭 Failed to watch custom files with error", err);
        // logger.config("config", config);
        vscode.window.showErrorMessage(
          `😭 Failed to watch custom files: ${err}`,
        );
      }
    } else {
      vscode.window.showErrorMessage(
        `Failed to find custom css and js files, exiting...`,
      );
    }
    console.info("custom css/js watcher initialized");
  },
  async isCustomCssJSInstalled() {
    try {
      const htmlContent = await fs.promises.readFile(
        this.htmlFile || "",
        "utf-8",
      );
      return htmlContent.includes("<!-- !! VSCODE-CUSTOM-CSS-START !! -->");
    } catch (e) {
      console.error("Error checking if custom CSS is installed:", e);
      return false;
    }
  },
};
