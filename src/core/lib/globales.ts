import { SidebarUiProvider } from "../../ui/sidebar/sidebar";
import * as fs from "fs";
import * as path from "path";
import { messageHandler } from "../lib/messages";
import * as vscode from "vscode";
import { Globals, VSCodeCustomCssConfig } from "./types";
import { helper } from "../actions/Helper";
import { THEME_NAME } from "./constants";
import { GlobalThis } from "./interfaces";
import {
  cmdInstallCssJsInjector,
  cmdUninstall,
  cmdUpdateCssJs,
} from "../actions/Commands";

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
  currentThemeJsonPath: undefined,
  currentThemeWatcher: undefined,
  configWatcher: undefined,
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

    // 6.1 - get current theme json path
    const currentTheme = vscode.workspace
      .getConfiguration("workbench")
      .get<string>("colorTheme");
    if (currentTheme) {
      // Look for theme in extensions
      const extensions = vscode.extensions.all;
      for (const ext of extensions) {
        if (ext.packageJSON?.contributes?.themes) {
          const themes = ext.packageJSON.contributes.themes;
          const themeData = themes.find(
            (theme: any) =>
              theme.label === currentTheme || theme.id === currentTheme,
          );
          if (themeData) {
            this.currentThemeJsonPath = path.join(
              ext.extensionPath,
              themeData.path,
            );
            break;
          }
        }
      }
    }
    console.info(
      "currentThemeJsonPath initialized:",
      this.currentThemeJsonPath,
    );

    // 6.2 - setup theme change watcher
    this.configWatcher = vscode.workspace.onDidChangeConfiguration((e) => {
      if (e.affectsConfiguration("workbench.colorTheme")) {
        this.updateCurrentThemeJsonPath();
        // Update sidebar to reflect new theme
        this.sidebarUiProvider?.updatePurpleThemeFuientUIStatus(
          vscode.workspace
            .getConfiguration("workbench")
            .get<string>("colorTheme") === THEME_NAME,
        );
      }
    });
    // 6.3 - setup initial theme file watcher
    this.setupThemeFileWatcher();

    // 6.4 push theme wathcer to subsciptions
    if (this.context) {
      this.context.subscriptions.push(this.configWatcher);
    }

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
          async (eventType, filename) => {
            console.log(`[watcher] (${filename}) changed (${eventType})`);
            // cmdUninstall(false);
            // cmdInstallCssJsInjector(false);
            // vscode.commands.executeCommand(
            //   "theme-editor-pro.updateCssJsInjection",
            // );
            await cmdUpdateCssJs();
            messageHandler.promptReloadAfterUpgrade();
          },
        );
        fs.watch(
          this.extentionConfig.jsUri,
          { encoding: "utf-8" },
          async (eventType, filename) => {
            console.log(`[watcher] (${filename}) changed (${eventType})`);
            await cmdUpdateCssJs();
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
  async initWatchers() {
    if (this.extentionConfig && (await this.isCustomCssJSInstalled())) {
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
  updateCurrentThemeJsonPath() {
    const currentTheme = vscode.workspace
      .getConfiguration("workbench")
      .get<string>("colorTheme");
    let newThemePath: string | undefined;

    if (currentTheme) {
      const extensions = vscode.extensions.all;
      for (const ext of extensions) {
        if (ext.packageJSON?.contributes?.themes) {
          const themes = ext.packageJSON.contributes.themes;
          const themeData = themes.find(
            (theme: any) =>
              theme.label === currentTheme || theme.id === currentTheme,
          );
          if (themeData) {
            newThemePath = path.join(ext.extensionPath, themeData.path);
            break;
          }
        }
      }
    }

    // Only update if path actually changed
    if (newThemePath !== this.currentThemeJsonPath) {
      this.currentThemeJsonPath = newThemePath;
      this.setupThemeFileWatcher();
      console.info("Theme changed, new path:", this.currentThemeJsonPath);
    }
  },
  setupThemeFileWatcher() {
    // Clear existing watcher
    if (this.currentThemeWatcher) {
      this.currentThemeWatcher.close();
      this.currentThemeWatcher = undefined;
    }

    // Set up new watcher if theme file exists
    if (this.currentThemeJsonPath && fs.existsSync(this.currentThemeJsonPath)) {
      try {
        this.currentThemeWatcher = fs.watch(
          this.currentThemeJsonPath,
          { encoding: "utf-8" },
          async (eventType, filename) => {
            console.log(
              `[theme-watcher] Theme file (${filename}) changed (${eventType})`,
            );
            await this.refreshTheme();
          },
        );
        console.log(
          "Theme file watcher set up for:",
          this.currentThemeJsonPath,
        );
      } catch (err) {
        console.error("Failed to watch theme file:", err);
      }
    }
  },

  //   const currentTheme = vscode.workspace
  //     .getConfiguration("workbench")
  //     .get<string>("colorTheme");
  //   if (currentTheme) {
  //     // Quickly switch to default dark theme and back
  //     const config = vscode.workspace.getConfiguration("workbench");
  //     await config.update(
  //       "colorTheme",
  //       "Default Dark+",
  //       vscode.ConfigurationTarget.Global,
  //     );

  //     // Small delay to ensure the change takes effect
  //     setTimeout(async () => {
  //       await config.update(
  //         "colorTheme",
  //         currentTheme,
  //         vscode.ConfigurationTarget.Global,
  //       );
  //       console.log("Theme refreshed:", currentTheme);
  //     }, 100);
  //   }
  // },
  // async refreshTheme() {
  //   const action = await vscode.window.showInformationMessage(
  //     "Theme file changed. Reload to see changes?",
  //     "Soft Reload",
  //     "Full Reload",
  //     "Ignore",
  //   );

  //   if (action === "Soft Reload") {
  //     try {
  //       // Try workspace reload first (preserves more editor state)
  //       await vscode.commands.executeCommand(
  //         "workbench.action.reloadWindowWithExtensionsDisabled",
  //       );
  //       setTimeout(async () => {
  //         await vscode.commands.executeCommand("workbench.action.reloadWindow");
  //       }, 1000);
  //     } catch {
  //       await vscode.commands.executeCommand("developer.reload");
  //     }
  //   } else if (action === "Full Reload") {
  //     await vscode.commands.executeCommand("workbench.action.reloadWindow");
  //   }
  // },
  async refreshTheme() {
    const action = await vscode.window.showInformationMessage(
      "Theme file changed. Reload to see changes?",
      "Developer Reload",
      "Full Reload",
      "Ignore",
    );

    if (action === "Developer Reload") {
      console.log("Theme file changed, performing developer reload...");
      try {
        await vscode.commands.executeCommand("developer.reload");
      } catch {
        // Fallback to full reload if developer.reload doesn't exist
        await vscode.commands.executeCommand("workbench.action.reloadWindow");
      }
    } else if (action === "Full Reload") {
      await vscode.commands.executeCommand("workbench.action.reloadWindow");
    }
  },
};
