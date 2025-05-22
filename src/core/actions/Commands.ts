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

export async function cmdInstallCssJsInjector() {
  const uuidSession = uuid.v4();
  await helper.createBackup(uuidSession);
  globals.sidebarUiProvider?.updateCssJsInjectorStatus(true);
  if (globals.purpleThemeFluentUIThemeStatus) {
    cmdtoggleThemes(true);
  }
  await helper.performPatch(uuidSession);
}

export async function cmdUninstall() {
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
    messageHandler.promptRestartIde();
  } catch (err) {
    console.error(`Error during uninstall: ${err}`);
    // Still update status even if error occurred
    globals.sidebarUiProvider?.updateCssJsInjectorStatus(false);
  }
}

export async function setCustomThemeSettingsDetailed() {
  try {
    const config = vscode.workspace.getConfiguration();

    // FluentUI settings
    await config.update(
      "fluentui.accent",
      "#bc47ffdd",
      vscode.ConfigurationTarget.Global,
    );
    await config.update(
      "fluentui.darkBackground",
      "#bc47ffdd",
      vscode.ConfigurationTarget.Global,
    );
    await config.update(
      "fluentui.lightBackground",
      "#bc47ffdd",
      vscode.ConfigurationTarget.Global,
    );

    // Get existing color customizations
    const colorCustomizations: { [key: string]: string } =
      config.get("workbench.colorCustomizations") || {};

    // Update specific colors
    colorCustomizations["titleBar.activeBackground"] = "#42304c";
    colorCustomizations["titleBar.inactiveBackground"] = "#42304c";
    colorCustomizations["editor.background"] = "#bc47ffdd";

    // Apply the updated color customizations
    await config.update(
      "workbench.colorCustomizations",
      colorCustomizations,
      vscode.ConfigurationTarget.Global,
    );

    vscode.window.showInformationMessage("All custom colors applied!");
  } catch (error) {
    vscode.window.showErrorMessage(`Error applying colors: ${error}`);
  }
}

export async function resetCustomThemeSettingsVerbose() {
  try {
    const config = vscode.workspace.getConfiguration();
    const resetOperations = [];

    // Reset FluentUI settings
    resetOperations.push(
      config.update(
        "fluentui.accent",
        undefined,
        vscode.ConfigurationTarget.Global,
      ),
      config.update(
        "fluentui.darkBackground",
        undefined,
        vscode.ConfigurationTarget.Global,
      ),
      config.update(
        "fluentui.lightBackground",
        undefined,
        vscode.ConfigurationTarget.Global,
      ),
    );

    // Handle workbench color customizations
    const currentColors: { [key: string]: string } =
      config.get("workbench.colorCustomizations") || {};
    const colorsToRemove = [
      "titleBar.activeBackground",
      "titleBar.inactiveBackground",
      "editor.background",
    ];

    // Create new object without the colors we want to remove
    const filteredColors = Object.keys(currentColors)
      .filter((key) => !colorsToRemove.includes(key))
      .reduce<Record<string, string>>((obj, key) => {
        obj[key] = currentColors[key];
        return obj;
      }, {});

    // Update or remove workbench.colorCustomizations
    resetOperations.push(
      config.update(
        "workbench.colorCustomizations",
        Object.keys(filteredColors).length > 0 ? filteredColors : undefined,
        vscode.ConfigurationTarget.Global,
      ),
    );

    // Wait for all operations to complete
    await Promise.all(resetOperations);

    vscode.window.showInformationMessage(
      "All custom theme settings have been reset to defaults!",
    );
  } catch (error) {
    vscode.window.showErrorMessage(`Error resetting theme settings: ${error}`);
  }
}

export async function cmdtoggleThemes(enable: boolean): Promise<void> {
  const config = vscode.workspace.getConfiguration("workbench");
  const currentTheme = config.get<string>("colorTheme");

  // 1) Ensure extension is installed
  if (enable && !vscode.extensions.getExtension(FLUENT_UI_EXT_ID)) {
    await vscode.commands.executeCommand(
      "workbench.extensions.installExtension",
      FLUENT_UI_EXT_ID,
    ); // auto‐enables on install :contentReference[oaicite:0]{index=0}
  }

  // 3) Toggle your theme and save/restore previous
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
  }

  // 2) Enable or disable Fluent UI
  if (enable) {
    // await setCustomThemeSettingsDetailed();
    await vscode.commands.executeCommand(FLUENT_ENABLE_CMD);
  } else if (vscode.extensions.getExtension(FLUENT_UI_EXT_ID)) {
    await vscode.commands.executeCommand(FLUENT_DISABLE_CMD);
  }
}
