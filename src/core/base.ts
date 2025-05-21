import * as vscode from "vscode";
import { registerCommands } from "./commands/Registrator";
import { globals } from "./lib/globales";
import { createLogger } from "../utils/logger";

export function activate_vscode_custom_ui_injector(
  context: vscode.ExtensionContext,
): void {
  const logger = createLogger("activate_vscode_custom_ui_injector");

  globals.init(context);
  logger.config("globals initialized:", globals);

  registerCommands(context);
}

// this method is called when your extension is deactivated
export function deactivate_vscode_custom_ui_injector(): void {}
