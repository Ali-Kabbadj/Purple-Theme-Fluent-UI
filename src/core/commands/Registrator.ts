import * as vscode from "vscode";
import {
  cmdInstall,
  cmdReinstall,
  cmdtoggleThemes,
  cmdUninstall,
} from "./Commands";

export function registerCommands(context: vscode.ExtensionContext): void {
  const enableThemeCommand = vscode.commands.registerCommand(
    "theme-editor-pro.enableTheme",
    () => cmdtoggleThemes(true),
  );

  const disableThemeCommand = vscode.commands.registerCommand(
    "theme-editor-pro.disableTheme",
    () => cmdtoggleThemes(false),
  );

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

  context.subscriptions.push(enableThemeCommand);
  context.subscriptions.push(disableThemeCommand);
  context.subscriptions.push(installCssJsInjection);
  context.subscriptions.push(uninstallCssJsInjection);
  context.subscriptions.push(updateCssJsInjection);
}
