import * as vscode from "vscode";
import { Config } from "../config/config";
import { Logger } from "../utils/logger";
import { Watcher } from "../watcher/watcher";
import { SidebarProvider } from "../ui/sidebar";

export function init_extension(context: vscode.ExtensionContext): void {
  const logger = new Logger("init_extension");
  let config = new Config(context);
  const watcher = new Watcher(config);
  watcher.init_watchers();
  logger.config("config init", config);
  let sidebarUiProvider = new SidebarProvider(config);
  context.subscriptions.push(
    vscode.window.registerWebviewViewProvider("SidebarUI", sidebarUiProvider, {
      webviewOptions: {
        retainContextWhenHidden: true,
      },
    }),
  );
}

export function uninstall_extension(): void {}
