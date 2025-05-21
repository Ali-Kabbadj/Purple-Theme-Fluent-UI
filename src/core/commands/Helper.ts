import { VSCodeCustomCssConfig } from "./../lib/types";
import * as fs from "fs";
import * as path from "path";
import * as vscode from "vscode";
import { messageHandler } from "../messages";
import * as Url from "url";
import * as os from "os";
import { globals } from "../lib/globales";

export interface Helper {
  uninstallImpl: () => Promise<void>;
  BackupFilePath: (uuid: string) => string;
  getBackupUuid: () => Promise<string | null>;
  createBackup: (uuidSession: string) => Promise<void>;
  restoreBackup: (backupFilePath: string) => Promise<void>;
  deleteBackupFiles: () => Promise<void>;
  performPatch: (uuidSession: string) => Promise<void>;
  enabledRestart: () => void;
  disabledRestart: () => void;
  clearExistingPatches: (html: string) => string;
  patchHtml: () => Promise<string>;
  patchHtmlForItem: (url: string) => Promise<string>;
  parsedUrl: (url: string) => string;
  isCustomCssInstalled: () => Promise<boolean>;
  resolveVariable: (key: string) => string | undefined;
  getContent: (url: string | URL) => Promise<Buffer>;
  UpdateConfigFiles: () => void;
}

export const helper: Helper = {
  uninstallImpl: async () => {
    try {
      const backupUuid = await helper.getBackupUuid();
      if (!backupUuid) {
        console.log("No backup UUID found in HTML file");
        // Clean up any stray backup files even if no UUID was found
        await helper.deleteBackupFiles();
        return;
      }
      const backupPath = helper.BackupFilePath(backupUuid);
      // Check if backup file exists before attempting to restore
      try {
        await fs.promises.access(backupPath, fs.constants.F_OK);
        console.log(`Found backup file: ${backupPath}`);
        await helper.restoreBackup(backupPath);
      } catch (err) {
        console.log(
          `Backup file not found: ${backupPath}, skipping restore step`,
        );
        // Don't throw error here - we should still continue and try to clean up
      }

      await helper.deleteBackupFiles();
      globals.sidebarProvider?.updateStatus(false);
    } catch (err) {
      console.error(`Error during uninstall: ${err}`);
      // Still update status even if error occurred
      globals.sidebarProvider?.updateStatus(false);
    }
  },

  //#######################   Backup #####################################
  BackupFilePath: (uuid) => {
    if (!globals.vs_code_base || globals.vs_code_base === undefined) {
      messageHandler.promptLocatePathBackupFailure();
      return "";
    }
    return path.join(
      globals.vs_code_base,
      "electron-sandbox",
      "workbench",
      `workbench.${uuid}.bak-custom-css`,
    );
  },

  getBackupUuid: async () => {
    try {
      // Check if file exists first
      try {
        if (globals.htmlFile === undefined) {
          return "";
        }
        await fs.promises.access(globals.htmlFile, fs.constants.F_OK);
      } catch (err) {
        console.log(`HTML file not found: ${globals.htmlFile}`);
        return null;
      }

      const htmlContent = await fs.promises.readFile(globals.htmlFile, "utf-8");
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
  },

  createBackup: async (uuidSession) => {
    try {
      if (globals.htmlFile === undefined) {
        return;
      }
      let html = await fs.promises.readFile(globals.htmlFile, "utf-8");
      html = helper.clearExistingPatches(html);
      const backupPath = helper.BackupFilePath(uuidSession);

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
      await messageHandler.promptRestartAsAdmin();
      throw e;
    }
  },

  restoreBackup: async (backupFilePath) => {
    try {
      if (fs.existsSync(backupFilePath)) {
        if (globals.htmlFile === undefined) {
          return;
        }
        // Check if the htmlFile exists before attempting to unlink it
        if (fs.existsSync(globals.htmlFile)) {
          try {
            await fs.promises.unlink(globals.htmlFile);
          } catch (err) {
            console.log(
              `Failed to unlink ${globals.htmlFile}, trying to continue anyway:`,
              err,
            );
            // Continue even if unlink fails
          }
        } else {
          // Try to find the workbench file again in case it was moved
          const appDir = require.main
            ? path.dirname(require.main.filename)
            : globals.globalGlobalThis._VSCODE_FILE_ROOT;

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
              globals.htmlFile = potentialPath; // Update the global htmlFile variable
              try {
                await fs.promises.unlink(globals.htmlFile);
                break; // Found and deleted, so break out of the loop
              } catch (err) {
                console.log(
                  `Failed to unlink ${globals.htmlFile}, trying to continue:`,
                  err,
                );
                // Continue even if unlink fails
              }
            }
          }
        }

        // Even if unlink failed, try to copy the backup file
        try {
          await fs.promises.copyFile(backupFilePath, globals.htmlFile);
          console.log(
            `Successfully restored backup from ${backupFilePath} to ${globals.htmlFile}`,
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
      messageHandler.promptRestartAsAdmin();
      throw e;
    }
  },

  deleteBackupFiles: async () => {
    try {
      if (globals.htmlFile === undefined) {
        return;
      }
      const htmlDir = path.dirname(globals.htmlFile.toString());
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
  },
  //#######################   Backup #####################################

  //#######################   Patch   #############################
  performPatch: async (uuidSession) => {
    if (globals.htmlFile === undefined) {
      return;
    }
    helper.UpdateConfigFiles();
    let html = await fs.promises.readFile(globals.htmlFile, "utf-8");
    html = helper.clearExistingPatches(html);
    if (!globals.extentionConfig) {
      return;
    }
    const injectHTML = await helper.patchHtml();
    html = html.replace(
      /<meta\s+http-equiv="Content-Security-Policy"[\s\S]*?\/>/,
      "",
    );

    html = html.replace(
      /(<\/html>)/,
      `<!-- !! VSCODE-CUSTOM-CSS-SESSION-ID ${uuidSession} !! -->\n` +
        "<!-- !! VSCODE-CUSTOM-CSS-START !! -->\n" +
        injectHTML +
        "<!-- !! VSCODE-CUSTOM-CSS-END !! -->\n</html>",
    );
    try {
      await fs.promises.writeFile(globals.htmlFile, html, "utf-8");
    } catch (e) {
      // vscode.window.showInformationMessage(msg.admin);
      await messageHandler.promptRestartAsAdmin();
      // disabledRestart();
      messageHandler.promptRestartIde();
      return;
    }
    // enabledRestart();
    messageHandler.promptRestartIde();
  },

  clearExistingPatches: (html) => {
    html = html.replace(
      /<!-- !! VSCODE-CUSTOM-CSS-START !! -->[\s\S]*?<!-- !! VSCODE-CUSTOM-CSS-END !! -->\n*/,
      "",
    );
    html = html.replace(
      /<!-- !! VSCODE-CUSTOM-CSS-SESSION-ID [\w-]+ !! -->\n*/g,
      "",
    );
    return html;
  },

  patchHtml: async () => {
    let res = "";
    if (!globals.extentionConfig || !globals.extentionConfig.imports) {
      return res;
    }
    for (const item of globals.extentionConfig.imports) {
      const imp = await helper.patchHtmlForItem(item);
      if (imp) {
        res += imp;
      }
    }
    return res;
  },

  patchHtmlForItem: async (url) => {
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
      parsed = helper.parsedUrl(url) as unknown as URL;
      const fetched = await helper.getContent(parsed);
      if (ext === ".css") {
        return `<style>${fetched}</style>`;
      } else if (ext === ".js") {
        return `<script>${fetched}</script>`;
      }
      throw new Error(`Unsupported extension type: ${ext}`);
    } catch (e) {
      console.error(e);
      messageHandler.cannotLoad(parsed.toString());
      return "";
    }
  },

  parsedUrl: (url) => {
    if (/^file:/.test(url)) {
      return url.replaceAll(
        /\$\{([^\{\}]+)\}/g,
        (substr, key) => helper.resolveVariable(key) ?? substr,
      );
    } else {
      return url;
    }
  },

  enabledRestart: function (): void {
    throw new Error("Function not implemented.");
  },

  disabledRestart: function (): void {
    throw new Error("Function not implemented.");
  },

  isCustomCssInstalled: async () => {
    try {
      if (globals.htmlFile === undefined) {
        return false;
      }
      const htmlContent = await fs.promises.readFile(globals.htmlFile, "utf-8");
      return htmlContent.includes("<!-- !! VSCODE-CUSTOM-CSS-START !! -->");
    } catch (e) {
      console.error("Error checking if custom CSS is installed:", e);
      return false;
    }
  },

  resolveVariable: (key) => {
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
  },

  getContent: async (url) => {
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
  },

  UpdateConfigFiles: () => {
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
      "customs",
      "custom.css",
    );
    const jsUri = path.join(
      extensionUri.fsPath,
      "resources",
      "customs",
      "custom.js",
    );

    // const extensionWatcherRoot = globals.context.extensionPath;
    // const injectorWatcherPath = path.join(
    //   extensionWatcherRoot,
    //   "resources",
    //   "customs",
    // );
    const extensionWatcherRoot =
      globals.context?.extensionPath ?? extensionUri.fsPath;
    const injectorWatcherPath = path.join(
      extensionWatcherRoot,
      "resources",
      "customs",
    );

    let tempConfig: VSCodeCustomCssConfig = {
      imports: [cssUri, jsUri],
      extensionUri: extensionUri,
      cssUri: cssUri,
      jsUri: jsUri,
    };
    console.info("config initialized:", globals.extentionConfig);
    globals.extentionConfig = tempConfig;
  },
};
