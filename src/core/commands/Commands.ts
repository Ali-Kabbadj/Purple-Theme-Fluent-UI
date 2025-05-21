import { globals } from "../lib/globales";
import * as vscode from "vscode";
import { THEME_NAME } from "../../utils/constants";
import * as uuid from "uuid";
import { helper } from "./Helper";
import { messageHandler } from "../messages";

export async function cmdInstall() {
  const uuidSession = uuid.v4();
  await helper.createBackup(uuidSession);
  await helper.performPatch(uuidSession);
  globals.sidebarProvider?.updateStatus(true);
}

export async function cmdReinstall() {
  try {
    console.log("Starting theme reinstall process");

    // Try to uninstall but don't fail if it doesn't work
    try {
      await helper.uninstallImpl();
    } catch (uninstallErr: any) {
      console.log(`Uninstall step had issues: ${uninstallErr.message}`);
      // Continue anyway with install
    }

    // Try to install the new version
    await cmdInstall();
    globals.sidebarProvider?.updateStatus(true);
  } catch (err: any) {
    console.error(`Error during reinstall: ${err}`);
    vscode.window.showErrorMessage(`Failed to update theme: ${err.message}`);

    // Try to determine current status
    try {
      const isInstalled = await helper.isCustomCssInstalled();
      globals.sidebarProvider?.updateStatus(isInstalled);
    } catch (statusErr) {
      console.error(`Could not determine current status: ${statusErr}`);
    }
  }
}

export async function cmdUninstall() {
  await helper.uninstallImpl();
  messageHandler.promptRestartIde();
  globals.sidebarProvider?.updateStatus(false);
}

export function cmdtoggleThemes(enable: boolean) {
  const config = vscode.workspace.getConfiguration("workbench");
  const currentTheme = config.get<string>("colorTheme");

  if (enable) {
    // Store the current theme before switching
    if (currentTheme !== THEME_NAME) {
      globals.context?.globalState.update(
        "theme-editor-pro.previousTheme",
        currentTheme,
      );
    }
    config.update("colorTheme", THEME_NAME, vscode.ConfigurationTarget.Global);
  } else {
    // Restore the previous theme or fallback
    const previousTheme =
      globals.context?.globalState.get<string>(
        "theme-editor-pro.previousTheme",
      ) || "Default Dark Modern";
    config.update(
      "colorTheme",
      previousTheme,
      vscode.ConfigurationTarget.Global,
    );
  }
}
