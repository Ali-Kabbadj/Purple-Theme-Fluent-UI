import * as vscode from "vscode";
import { registerCommands } from "./actions/Registrator";
import { globals } from "./lib/globales";
import { THEME_NAME } from "./lib/constants";

export function init_extension(context: vscode.ExtensionContext): void {
  globals.init(context);
  registerCommands(context);
}

export function deactivate_extension(): void {
  const config = vscode.workspace.getConfiguration("workbench");
  if (config.get<string>("colorTheme") === THEME_NAME) {
    config.update(
      "colorTheme",
      "Default Dark Modern",
      vscode.ConfigurationTarget.Global,
    );
  }
}
