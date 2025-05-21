import * as vscode from "vscode";
import {
  activate_vscode_custom_ui_injector,
  deactivate_vscode_custom_ui_injector,
} from "./vscode-custom-ui-injector/base";
import { THEME_NAME } from "./utils/constants";

export async function activate(context: vscode.ExtensionContext) {
  if (context.extensionMode === vscode.ExtensionMode.Development) {
    console.log('Yeey!! Theme Editor Pro is live! 💜');
    await vscode.commands.executeCommand("workbench.action.toggleDevTools");
  }

  // In extension.ts
  vscode.workspace.onDidChangeConfiguration((e) => {
    if (e.affectsConfiguration("workbench.colorTheme")) {
      const currentTheme = vscode.workspace
        .getConfiguration("workbench")
        .get<string>("colorTheme");
      context.globalState.update(
        "themeEnabled",
        currentTheme === "Purple Theme Fluent-UI",
      );
    }
  });

  const config = vscode.workspace.getConfiguration("workbench");

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
