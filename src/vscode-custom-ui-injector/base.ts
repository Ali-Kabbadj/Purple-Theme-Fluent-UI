import * as vscode from "vscode";
import * as fs from "fs";
import * as os from "os";
import * as path from "path";
import { messages as msg } from "./messages";
import * as uuid from "uuid";
import * as Url from "url";
// import { createLogger } from "../utils/logger";
import {
  CustomUiSidebarProvider,
  isCustomCssInstalled,
} from "../ui/sidebar/sidebar";
import { THEME_NAME } from "../utils/constants";

let sidebarProvider: CustomUiSidebarProvider | null = null;

interface VSCodeCustomCssConfig {
  imports: string[];
  extensionUri: vscode.Uri;
  cssUri: string; // absolute file path as string
  jsUri: string; // absolute file path as string
  statusbar?: boolean;
  filesToWatch?: VSCodeCustomCssConfigWatcherFileUris;
}

interface VSCodeCustomCssConfigWatcherFileUris {
  cssUri: string; // absolute file path as string
  jsUri: string; // absolute file path as string
}

interface GlobalThis {
  _VSCODE_FILE_ROOT?: string;
}

declare const globalThis: GlobalThis;
let config: VSCodeCustomCssConfig;

export function activate_vscode_custom_ui_injector(
  context: vscode.ExtensionContext,
): void {
  // init logger
  // const logger = createLogger("activate_vscode_custom_ui_injector");
  // logger.info("Starting UI injector activation");

  // setup config and watcher for hot reload
  fetchAndUpdateConfigFiles();
  initConfigFilesWatcher();

  const appDir = require.main
    ? path.dirname(require.main.filename)
    : globalThis._VSCODE_FILE_ROOT;
  if (!appDir) {
    vscode.window.showInformationMessage(
      msg.unableToLocateVsCodeInstallationPath,
    );
  }

  const base = path.join(appDir as string, "vs", "code");
  let htmlFile = path.join(
    base,
    "electron-sandbox",
    "workbench",
    "workbench.html",
  );

  if (!fs.existsSync(htmlFile)) {
    htmlFile = path.join(
      base,
      "electron-sandbox",
      "workbench",
      "workbench-apc-extension.html",
    );
  }

  if (!fs.existsSync(htmlFile)) {
    htmlFile = path.join(
      base,
      "electron-sandbox",
      "workbench",
      "workbench.esm.html",
    );
  }

  if (!fs.existsSync(htmlFile)) {
    vscode.window.showInformationMessage(
      msg.unableToLocateVsCodeInstallationPath,
    );
  }

  const BackupFilePath = (uuid: string): string =>
    path.join(
      base,
      "electron-sandbox",
      "workbench",
      `workbench.${uuid}.bak-custom-css`,
    );

  registerSideBar();

  function fetchAndUpdateConfigFiles() {
    const extensionUri = vscode.extensions.getExtension(
      "Ali-Kabbadj.theme-editor-pro",
    )?.extensionUri;

    if (!extensionUri) {
      // logger.error("Could not locate extension URI", extensionUri);
      vscode.window.showErrorMessage("Could not locate extension URI");
      return;
    }

    const cssUri = path.join(
      extensionUri.fsPath,
      "resources",
      "vscode-custom-ui-injector",
      "custom.css",
    );
    const jsUri = path.join(
      extensionUri.fsPath,
      "resources",
      "vscode-custom-ui-injector",
      "custom.js",
    );

    const extensionWatcherRoot = context.extensionPath;
    const injectorWatcherPath = path.join(
      extensionWatcherRoot,
      "resources",
      "vscode-custom-ui-injector",
    );

    let tempConfig: VSCodeCustomCssConfig = {
      imports: [cssUri, jsUri],
      extensionUri: extensionUri,
      cssUri: cssUri,
      jsUri: jsUri,
      filesToWatch: {
        cssUri: path.join(injectorWatcherPath, "custom.css"),
        jsUri: path.join(injectorWatcherPath, "custom.js"),
      },
      statusbar: true,
    };
    console.info("config initialized:", config);
    config = tempConfig;
    if (sidebarProvider) {
      sidebarProvider.updatePaths(config.cssUri, config.jsUri);
    }
  }

  function initConfigFilesWatcher() {
    if (config) {
      try {
        fs.watch(
          config.cssUri,
          { encoding: "utf-8" },
          (eventType, filename) => {
            console.log(`[watcher] (${filename}) changed (${eventType})`);
            vscode.commands.executeCommand("extension.updatePurpleTheme");
          },
        );
        fs.watch(config.jsUri, { encoding: "utf-8" }, (eventType, filename) => {
          console.log(`[watcher] (${filename}) changed (${eventType})`);
          vscode.commands.executeCommand("extension.updatePurpleTheme");
        });
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
  }

  function resolveVariable(key: string): string | undefined {
    const variables: Record<string, () => string> = {
      cwd: () => process.cwd(),
      userHome: () => os.homedir(),
      execPath: () => process.env.VSCODE_EXEC_PATH ?? process.execPath,
      pathSeparator: () => path.sep,
      "/": () => path.sep,
    };

    if (key in variables) {
      return variables[key]();
    }

    if (key.startsWith("env:")) {
      const [_, envKey, optionalDefault] = key.split(":");
      return process.env[envKey as string] ?? optionalDefault ?? "";
    }

    return undefined;
  }

  function parsedUrl(url: string): string {
    if (/^file:/.test(url)) {
      return url.replaceAll(
        /\$\{([^\{\}]+)\}/g,
        (substr, key) => resolveVariable(key) ?? substr,
      );
    } else {
      return url;
    }
  }

  // async function getContent(url: string | URL): Promise<Buffer> {
  //   try {
  //     if (/^file:/.test(url.toString())) {
  //       // For file:// URLs, use fs module instead of node-fetch
  //       const fp = Url.fileURLToPath(url);
  //       return await fs.promises.readFile(fp);
  //     } else if (typeof url === "string" && /^[a-zA-Z]:\\/.test(url)) {
  //       // Handle Windows absolute paths directly
  //       return await fs.promises.readFile(url);
  //     } else if (typeof url === "string" && url.startsWith("/")) {
  //       // Handle Unix absolute paths directly
  //       return await fs.promises.readFile(url);
  //     } else {
  //       // Only use node-fetch for HTTP/HTTPS URLs
  //       if (typeof url === "string" && !url.startsWith("http")) {
  //         // If it's not an HTTP URL and not handled above, assume it's a local path
  //         return await fs.promises.readFile(url);
  //       }

  //       // For HTTP/HTTPS URLs
  //       const fetch = require("node-fetch");
  //       const response = await fetch(url);
  //       return await response.buffer();
  //     }
  //   } catch (error) {
  //     console.error(`Failed to load content from ${url}:`, error);
  //     throw error;
  //   }
  // }

  async function getContent(url: string | URL): Promise<Buffer> {
    try {
      let filePath: string;
      if (typeof url === "string") {
        if (url.startsWith("file://")) {
          filePath = Url.fileURLToPath(url);
        } else {
          filePath = url;
        }
      } else {
        filePath = Url.fileURLToPath(url);
      }
      return await fs.promises.readFile(filePath);
    } catch (error) {
      console.error(`Failed to load content from ${url}:`, error);
      throw error;
    }
  }

  // ####  main commands ######################################################

  async function cmdInstall(): Promise<void> {
    const uuidSession = uuid.v4();
    await createBackup(uuidSession);
    await performPatch(uuidSession);
    sidebarProvider?.updateStatus(true);
  }

  async function cmdReinstall(): Promise<void> {
    try {
      console.log("Starting theme reinstall process");

      // Try to uninstall but don't fail if it doesn't work
      try {
        await uninstallImpl();
      } catch (uninstallErr: any) {
        console.log(`Uninstall step had issues: ${uninstallErr.message}`);
        // Continue anyway with install
      }

      // Try to install the new version
      await cmdInstall();
      sidebarProvider?.updateStatus(true);
    } catch (err: any) {
      console.error(`Error during reinstall: ${err}`);
      vscode.window.showErrorMessage(`Failed to update theme: ${err.message}`);

      // Try to determine current status
      try {
        const isInstalled = await isCustomCssInstalled(htmlFile);
        sidebarProvider?.updateStatus(isInstalled);
      } catch (statusErr) {
        console.error(`Could not determine current status: ${statusErr}`);
      }
    }
  }

  async function cmdUninstall(): Promise<void> {
    await uninstallImpl();
    disabledRestart();
    sidebarProvider?.updateStatus(false);
  }

  async function uninstallImpl(): Promise<void> {
    try {
      const backupUuid = await getBackupUuid(htmlFile);
      if (!backupUuid) {
        console.log("No backup UUID found in HTML file");
        // Clean up any stray backup files even if no UUID was found
        await deleteBackupFiles();
        return;
      }

      const backupPath = BackupFilePath(backupUuid);

      // Check if backup file exists before attempting to restore
      try {
        await fs.promises.access(backupPath, fs.constants.F_OK);
        console.log(`Found backup file: ${backupPath}`);
        await restoreBackup(backupPath);
      } catch (err) {
        console.log(
          `Backup file not found: ${backupPath}, skipping restore step`,
        );
        // Don't throw error here - we should still continue and try to clean up
      }

      await deleteBackupFiles();
      sidebarProvider?.updateStatus(false);
    } catch (err) {
      console.error(`Error during uninstall: ${err}`);
      // Still update status even if error occurred
      sidebarProvider?.updateStatus(false);
    }
  }

  // #### Backup ################################################################

  async function getBackupUuid(htmlFilePath: string): Promise<string | null> {
    try {
      // Check if file exists first
      try {
        await fs.promises.access(htmlFilePath, fs.constants.F_OK);
      } catch (err) {
        console.log(`HTML file not found: ${htmlFilePath}`);
        return null;
      }

      const htmlContent = await fs.promises.readFile(htmlFilePath, "utf-8");
      const m = htmlContent.match(
        /<!-- !! VSCODE-CUSTOM-CSS-SESSION-ID ([0-9a-fA-F-]+) !! -->/,
      );
      if (!m) {
        console.log("No backup UUID found in HTML content");
        return null;
      } else {
        return m[1];
      }
    } catch (e) {
      console.error(`Error getting backup UUID: ${e}`);
      return null;
    }
  }

  async function createBackup(uuidSession: string): Promise<void> {
    try {
      let html = await fs.promises.readFile(htmlFile, "utf-8");
      html = clearExistingPatches(html);
      const backupPath = BackupFilePath(uuidSession);

      // Ensure directory exists
      const backupDir = path.dirname(backupPath);
      try {
        await fs.promises.access(backupDir, fs.constants.F_OK);
      } catch (err) {
        // Directory doesn't exist - create it
        await fs.promises.mkdir(backupDir, { recursive: true });
        console.log(`Created backup directory: ${backupDir}`);
      }

      await fs.promises.writeFile(backupPath, html, "utf-8");
      console.log(`Backup created at: ${backupPath}`);
    } catch (e) {
      console.error(`Error creating backup: ${e}`);
      vscode.window.showInformationMessage(msg.admin);
      throw e;
    }
  }

  async function restoreBackup(backupFilePath: string): Promise<void> {
    try {
      if (fs.existsSync(backupFilePath)) {
        // Check if the htmlFile exists before attempting to unlink it
        if (fs.existsSync(htmlFile)) {
          try {
            await fs.promises.unlink(htmlFile);
          } catch (err) {
            console.log(
              `Failed to unlink ${htmlFile}, trying to continue anyway:`,
              err,
            );
            // Continue even if unlink fails
          }
        } else {
          // Try to find the workbench file again in case it was moved
          const appDir = require.main
            ? path.dirname(require.main.filename)
            : globalThis._VSCODE_FILE_ROOT;

          if (!appDir) {
            throw new Error("Unable to locate VS Code installation path");
          }

          const base = path.join(appDir as string, "vs", "code");
          // Try various possible workbench HTML file paths
          const possiblePaths = [
            path.join(base, "electron-sandbox", "workbench", "workbench.html"),
            path.join(
              base,
              "electron-sandbox",
              "workbench",
              "workbench-apc-extension.html",
            ),
            path.join(
              base,
              "electron-sandbox",
              "workbench",
              "workbench.esm.html",
            ),
            path.join(base, "electron-browser", "workbench", "workbench.html"), // older VS Code versions
            // Add more potential paths if needed
          ];

          // Find the first path that exists
          for (const potentialPath of possiblePaths) {
            if (fs.existsSync(potentialPath)) {
              console.log(`Found workbench at new location: ${potentialPath}`);
              htmlFile = potentialPath; // Update the global htmlFile variable
              try {
                await fs.promises.unlink(htmlFile);
                break; // Found and deleted, so break out of the loop
              } catch (err) {
                console.log(
                  `Failed to unlink ${htmlFile}, trying to continue:`,
                  err,
                );
                // Continue even if unlink fails
              }
            }
          }
        }

        // Even if unlink failed, try to copy the backup file
        try {
          await fs.promises.copyFile(backupFilePath, htmlFile);
          console.log(
            `Successfully restored backup from ${backupFilePath} to ${htmlFile}`,
          );
        } catch (copyErr) {
          console.error(`Failed to copy backup file: ${copyErr}`);
          vscode.window.showErrorMessage(
            `Failed to restore workbench: ${copyErr}`,
          );
          throw copyErr;
        }
      } else {
        console.log(`No backup file found at ${backupFilePath}`);
      }
    } catch (e) {
      console.error(`Error in restoreBackup: ${e}`);
      vscode.window.showInformationMessage(`${msg.admin} Error: ${e}`);
      throw e;
    }
  }

  async function deleteBackupFiles(): Promise<void> {
    try {
      const htmlDir = path.dirname(htmlFile);
      try {
        const htmlDirItems = await fs.promises.readdir(htmlDir);
        for (const item of htmlDirItems) {
          if (item.endsWith(".bak-custom-css")) {
            try {
              await fs.promises.unlink(path.join(htmlDir, item));
            } catch (err) {
              console.log(`Could not delete backup file: ${item}`);
              // Continue with other files
            }
          }
        }
      } catch (err) {
        console.log(`Could not read directory: ${htmlDir}`);
      }
    } catch (err) {
      console.error(`Error in deleteBackupFiles: ${err}`);
    }
  }

  // #### Patching ##############################################################

  async function performPatch(uuidSession: string): Promise<void> {
    fetchAndUpdateConfigFiles();
    let html = await fs.promises.readFile(htmlFile, "utf-8");
    html = clearExistingPatches(html);
    if (!config) {
      return;
    }
    const injectHTML = await patchHtml(config);
    html = html.replace(
      /<meta\s+http-equiv="Content-Security-Policy"[\s\S]*?\/>/,
      "",
    );

    let indicatorJS = "";
    if (config.statusbar) {
      indicatorJS = await getIndicatorJs();
    }

    html = html.replace(
      /(<\/html>)/,
      `<!-- !! VSCODE-CUSTOM-CSS-SESSION-ID ${uuidSession} !! -->\n` +
        "<!-- !! VSCODE-CUSTOM-CSS-START !! -->\n" +
        indicatorJS +
        injectHTML +
        "<!-- !! VSCODE-CUSTOM-CSS-END !! -->\n</html>",
    );
    try {
      await fs.promises.writeFile(htmlFile, html, "utf-8");
    } catch (e) {
      vscode.window.showInformationMessage(msg.admin);
      disabledRestart();
      return;
    }
    enabledRestart();
  }

  function clearExistingPatches(html: string): string {
    html = html.replace(
      /<!-- !! VSCODE-CUSTOM-CSS-START !! -->[\s\S]*?<!-- !! VSCODE-CUSTOM-CSS-END !! -->\n*/,
      "",
    );
    html = html.replace(
      /<!-- !! VSCODE-CUSTOM-CSS-SESSION-ID [\w-]+ !! -->\n*/g,
      "",
    );
    return html;
  }

  async function patchHtml(config: VSCodeCustomCssConfig): Promise<string> {
    let res = "";
    for (const item of config.imports) {
      const imp = await patchHtmlForItem(item);
      if (imp) {
        res += imp;
      }
    }
    return res;
  }

  async function patchHtmlForItem(url: string): Promise<string> {
    if (!url) {
      return "";
    }
    if (typeof url !== "string") {
      return "";
    }

    // Copy the resource to a staging directory inside the extension dir
    let parsed = new Url.URL(url);
    const ext = path.extname(parsed.pathname);

    try {
      parsed = parsedUrl(url) as unknown as URL;
      const fetched = await getContent(parsed);
      if (ext === ".css") {
        return `<style>${fetched}</style>`;
      } else if (ext === ".js") {
        return `<script>${fetched}</script>`;
      }
      throw new Error(`Unsupported extension type: ${ext}`);
    } catch (e) {
      console.error(e);
      vscode.window.showWarningMessage(msg.cannotLoad(parsed.toString()));
      return "";
    }
  }

  async function getIndicatorJs(): Promise<string> {
    let indicatorJsPath: string;
    let ext = vscode.extensions.getExtension("be5invis.vscode-custom-css");
    if (ext && ext.extensionPath) {
      indicatorJsPath = path.resolve(ext.extensionPath, "src/statusbar.js");
    } else {
      indicatorJsPath = path.resolve(__dirname, "statusbar.js");
    }
    const indicatorJsContent = await fs.promises.readFile(
      indicatorJsPath,
      "utf-8",
    );
    return `<script>${indicatorJsContent}</script>`;
  }

  function reloadWindow(): void {
    // reload vscode-window
    vscode.commands.executeCommand("workbench.action.reloadWindow");
  }

  function enabledRestart(): void {
    vscode.window
      .showInformationMessage(msg.enabled, msg.restartIde)
      .then((btn) => {
        // if close button is clicked btn is undefined, so no reload window
        if (btn === msg.restartIde) {
          reloadWindow();
        }
      });
  }

  function disabledRestart(): void {
    vscode.window
      .showInformationMessage(msg.disabled, msg.restartIde)
      .then((btn) => {
        if (btn === msg.restartIde) {
          reloadWindow();
        }
      });
  }

  function registerSideBar(): void {
    sidebarProvider = new CustomUiSidebarProvider(context);

    context.subscriptions.push(
      vscode.window.registerWebviewViewProvider(
        "customUiSidebar", // MUST match the ID in package.json
        sidebarProvider,
        {
          webviewOptions: {
            retainContextWhenHidden: true, // Helps prevent view reloading issues
          },
        },
      ),
    );

    if (config) {
      sidebarProvider.updatePaths(config.cssUri, config.jsUri);

      // Check if custom CSS is installed and update sidebar accordingly
      isCustomCssInstalled(htmlFile).then((isInstalled) => {
        sidebarProvider?.updateStatus(isInstalled);
      });
    }
  }

  /**
   * Enable or disable the theme programmatically
   * @param enable Whether to enable the theme
   */
  // In base.ts
  async function toggleTheme(enable: boolean): Promise<void> {
    const config = vscode.workspace.getConfiguration("workbench");
    const currentTheme = config.get<string>("colorTheme");

    if (enable) {
      // Store the current theme before switching
      if (currentTheme !== THEME_NAME) {
        await context.globalState.update(
          "theme-editor-pro.previousTheme",
          currentTheme,
        );
      }
      await config.update(
        "colorTheme",
        THEME_NAME,
        vscode.ConfigurationTarget.Global,
      );
    } else {
      // Restore the previous theme or fallback
      const previousTheme =
        context.globalState.get<string>("theme-editor-pro.previousTheme") ||
        "Default Dark Modern";
      await config.update(
        "colorTheme",
        previousTheme,
        vscode.ConfigurationTarget.Global,
      );
    }
  }

  // Register commands for enabling/disabling Purple Theme
  const enableThemeCommand = vscode.commands.registerCommand(
    "theme-editor-pro.enableTheme",
    () => toggleTheme(true),
  );

  const disableThemeCommand = vscode.commands.registerCommand(
    "theme-editor-pro.disableTheme",
    () => toggleTheme(false),
  );
  context.subscriptions.push(enableThemeCommand);
  context.subscriptions.push(disableThemeCommand);

  // Register commands for enabling/disabling css/js injection
  const installCssJsInjection = vscode.commands.registerCommand(
    "theme-editor-pro.installCssJsInjection",
    cmdInstall,
  );
  const uninstallCssJsInjection = vscode.commands.registerCommand(
    "theme-editor-pro.uninstallCssJsInjection",
    cmdUninstall,
  );
  const updateCssJsInjection = vscode.commands.registerCommand(
    "theme-editor-pro.updateCssJsInjection",
    cmdReinstall,
  );
  context.subscriptions.push(installCssJsInjection);
  context.subscriptions.push(uninstallCssJsInjection);
  context.subscriptions.push(updateCssJsInjection);

  // const installPurpleTheme = vscode.commands.registerCommand(
  //   "extension.installPurpleTheme",
  //   cmdInstall,
  // );
  // const uninstallPurpleTheme = vscode.commands.registerCommand(
  //   "extension.uninstallPurpleTheme",
  //   cmdUninstall,
  // );
  // const updatePurpleTheme = vscode.commands.registerCommand(
  //   "extension.updatePurpleTheme",
  //   cmdReinstall,
  // );

  // context.subscriptions.push(installPurpleTheme);
  // context.subscriptions.push(uninstallPurpleTheme);
  // context.subscriptions.push(updatePurpleTheme);

  // console.log("vscode-custom-css is active!");
  // console.log("Application directory", appDir);
  // console.log("Main HTML file", htmlFile);
}

// this method is called when your extension is deactivated
export function deactivate_vscode_custom_ui_injector(): void {}
