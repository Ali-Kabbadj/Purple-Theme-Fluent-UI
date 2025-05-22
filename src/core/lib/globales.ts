import { SidebarUiProvider } from "../../ui/sidebar/sidebar";
import * as fs from "fs";
import * as path from "path";
import { messageHandler } from "../lib/messages";
import * as vscode from "vscode";
import { Globals, VSCodeCustomCssConfig } from "./types";
import { helper } from "../actions/Helper";
import { THEME_NAME } from "./constants";
import { GlobalThis } from "./interfaces";

declare const globalThis: GlobalThis;

export const globals: Globals = {
  context: undefined,
  app_dir: undefined,
  vs_code_base: undefined,
  htmlFilePath: undefined,
  extentionConfig: undefined,
  sidebarUiProvider: undefined,
  globalGlobalThis: globalThis,
  purpleThemeFluentUIThemeStatus: false,
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
    console.info("app_dir initialized:", this.htmlFilePath);

    // 3 - base vscode url
    this.vs_code_base = path.join(this.app_dir as string, "vs", "code");
    this.htmlFilePath = path.join(
      this.vs_code_base,
      "electron-sandbox",
      "workbench",
      "workbench.html",
    );
    console.info("vscode url initialized:", this.htmlFilePath);

    // 4 - workbench html
    if (!fs.existsSync(this.htmlFilePath)) {
      this.htmlFilePath = path.join(
        this.vs_code_base,
        "electron-sandbox",
        "workbench",
        "workbench-apc-extension.html",
      );
    }
    if (!fs.existsSync(this.htmlFilePath)) {
      this.htmlFilePath = path.join(
        this.vs_code_base,
        "electron-sandbox",
        "workbench",
        "workbench.esm.html",
      );
    }
    if (!fs.existsSync(this.htmlFilePath)) {
      async () => {
        await messageHandler.promptLocatePathFailure();
      };
    }
    console.info("workbench html initialized:", this.htmlFilePath);

    //  5 - Extention Config
    helper.UpdateConfigWithCssJSFiles();
    console.info("config initialized:", this.extentionConfig);

    // 6 - check game status
    this.purpleThemeFluentUIThemeStatus =
      vscode.workspace
        .getConfiguration("workbench")
        .get<string>("colorTheme") === THEME_NAME;

    // 7 - register sidebar
    this.sidebarUiProvider = new SidebarUiProvider();
    context.subscriptions.push(
      vscode.window.registerWebviewViewProvider(
        "customUiSidebar",
        this.sidebarUiProvider,
        {
          webviewOptions: {
            retainContextWhenHidden: true,
          },
        },
      ),
    );
    this.isCustomCssJSInstalled().then((isInstalled: boolean) => {
      this.sidebarUiProvider?.updateCssJsInjectorStatus(isInstalled);
    });
    console.info("sidebarUiProvider initialized:", this.extentionConfig);

    // 8 - init custom css/js watcher
    if (this.extentionConfig) {
      try {
        fs.watch(
          this.extentionConfig.cssUri,
          { encoding: "utf-8" },
          (eventType, filename) => {
            console.log(`[watcher] (${filename}) changed (${eventType})`);
            // vscode.commands.executeCommand(
            //   "theme-editor-pro.updateCssJsInjection",
            // );
            messageHandler.promptReloadAfterUpgrade();
          },
        );
        fs.watch(
          this.extentionConfig.jsUri,
          { encoding: "utf-8" },
          (eventType, filename) => {
            console.log(`[watcher] (${filename}) changed (${eventType})`);
            // vscode.commands.executeCommand(
            //   "theme-editor-pro.updateCssJsInjection",
            // );
            messageHandler.promptReloadAfterUpgrade();
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
        this.htmlFilePath || "",
        "utf-8",
      );
      return htmlContent.includes("<!-- !! VSCODE-CUSTOM-CSS-START !! -->");
    } catch (e) {
      console.error("Error checking if custom CSS is installed:", e);
      return false;
    }
  },
  async initWatchers(){
      if (this.extentionConfig && await this.isCustomCssJSInstalled()) {
      try {
        fs.watch(
          this.extentionConfig.cssUri,
          { encoding: "utf-8" },
          (eventType, filename) => {
            console.log(`[watcher] (${filename}) changed (${eventType})`);
            // vscode.commands.executeCommand(
            //   "theme-editor-pro.updateCssJsInjection",
            // );
            messageHandler.promptReloadAfterUpgrade();
          },
        );
        fs.watch(
          this.extentionConfig.jsUri,
          { encoding: "utf-8" },
          (eventType, filename) => {
            console.log(`[watcher] (${filename}) changed (${eventType})`);
            // vscode.commands.executeCommand(
            //   "theme-editor-pro.updateCssJsInjection",
            // );
            messageHandler.promptReloadAfterUpgrade();
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
  }
};
