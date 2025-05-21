import * as vscode from "vscode";
import {
  activate_vscode_custom_ui_injector,
  deactivate_vscode_custom_ui_injector,
} from "./core/base";
import { THEME_NAME } from "./utils/constants";

export async function activate(context: vscode.ExtensionContext) {
  if (context.extensionMode === vscode.ExtensionMode.Development) {
    console.log("Yeey!! Theme Editor Pro is live! 💜");
    // await vscode.commands.executeCommand("workbench.action.toggleDevTools");
  }

  activate_vscode_custom_ui_injector(context);
}

// In extension.ts
export function deactivate() {
  // Add cleanup logic
  const config = vscode.workspace.getConfiguration("workbench");
  if (config.get<string>("colorTheme") === THEME_NAME) {
    config.update(
      "colorTheme",
      "Default Dark Modern",
      vscode.ConfigurationTarget.Global,
    );
  }
  deactivate_vscode_custom_ui_injector();
}
