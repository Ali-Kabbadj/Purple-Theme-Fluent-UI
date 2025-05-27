import { globals } from "../lib/globales";
import * as vscode from "vscode";
import {
  FLUENT_DISABLE_CMD,
  FLUENT_ENABLE_CMD,
  FLUENT_UI_EXT_ID,
  THEME_NAME,
} from "../lib/constants";
import * as uuid from "uuid";
import { helper } from "./Helper";
import fs from "fs";
import { messageHandler } from "../lib/messages";

export async function cmdInstallCssJsInjector(how_restart = true) {
  const uuidSession = uuid.v4();
  await helper.createBackup(uuidSession);
  globals.sidebarUiProvider?.updateCssJsInjectorStatus(true);
  if (globals.purpleThemeFluentUIThemeStatus) {
    cmdtoggleThemes(true);
  }
  await helper.performPatch(uuidSession);
}

export async function cmdUpdateCssJs() {
  // uninstall
  const backupUuid = await helper.getBackupUuid();
  if (!backupUuid) {
    console.log("No backup UUID found in HTML file");
    // Clean up any stray backup files even if no UUID was found
    await helper.deleteBackupFiles();
  } else {
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
  }
  // reinstall
  const uuidSession = uuid.v4();
  await helper.createBackup(uuidSession);
  if (globals.purpleThemeFluentUIThemeStatus) {
    cmdtoggleThemes(true);
  }
  globals.sidebarUiProvider?.updateCssJsInjectorStatus(true);
  await helper.performPatch(uuidSession);
}

export async function cmdUninstall(show_restart = true) {
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
    globals.sidebarUiProvider?.updateCssJsInjectorStatus(false);
    if (globals.purpleThemeFluentUIThemeStatus) {
      cmdtoggleThemes(true);
    }
    if (show_restart) {
      messageHandler.promptRestartIde();
    }
  } catch (err) {
    console.error(`Error during uninstall: ${err}`);
    // Still update status even if error occurred
    globals.sidebarUiProvider?.updateCssJsInjectorStatus(false);
  }
}

export async function cmdtoggleThemes(enable: boolean): Promise<void> {
  const config = vscode.workspace.getConfiguration("workbench");
  const currentTheme = config.get<string>("colorTheme");
  const cssJsInjectorInstalled = await globals.isCustomCssJSInstalled();

  // 1) Ensure extension is installed
  if (enable && !vscode.extensions.getExtension(FLUENT_UI_EXT_ID)) {
    await vscode.commands.executeCommand(
      "workbench.extensions.installExtension",
      FLUENT_UI_EXT_ID,
    ); // auto‐enables on install :contentReference[oaicite:0]{index=0}
  }

  // 3) Toggle  theme and save/restore previous
  if (enable) {
    if (currentTheme !== THEME_NAME) {
      globals.context?.globalState.update(
        "theme-editor-pro.previousTheme",
        currentTheme,
      );
    }
    await config.update(
      "colorTheme",
      THEME_NAME,
      vscode.ConfigurationTarget.Global,
    );
    globals.sidebarUiProvider?.updatePurpleThemeFuientUIStatus(true);
  } else {
    const previous =
      globals.context?.globalState.get<string>(
        "theme-editor-pro.previousTheme",
      ) || "Default Dark Modern";
    await config.update(
      "colorTheme",
      previous,
      vscode.ConfigurationTarget.Global,
    );
    globals.sidebarUiProvider?.updatePurpleThemeFuientUIStatus(false);
    if (cssJsInjectorInstalled) {
      cmdInstallCssJsInjector();
    }
  }

  // 2) Enable or disable Fluent UI
  if (enable) {
    // await setCustomThemeSettingsDetailed();
    await vscode.commands.executeCommand(FLUENT_ENABLE_CMD);
  } else if (vscode.extensions.getExtension(FLUENT_UI_EXT_ID)) {
    await vscode.commands.executeCommand(FLUENT_DISABLE_CMD);
  }
}
