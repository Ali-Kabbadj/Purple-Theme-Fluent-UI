import * as vscode from "vscode";
import { Config } from "./config/config";
import { Logger } from "./utils/logger";
import { Watcher } from "./watcher/watcher";
import {
  isCssJsInjectionEnabled,
  isFluentUIEnabled,
} from "./config/lib/Helpers";
import { SidebarProvider } from "./sidebar/sidebarProvider";
import { restore_workspace_to_clean } from "./injection/unpatch/restore";

export async function init_extension(
  context: vscode.ExtensionContext,
): Promise<void> {
  const logger = new Logger("init_extension");
  let config = new Config(context);

  // init config
  const is_css_js_injection_enabled = await isCssJsInjectionEnabled(
    config.paths.workbench_html_file,
  );
  const is_purple_theme_enabled = await isFluentUIEnabled(
    config.paths.workbench_html_file,
  );
  await config.set_is_css_js_injection_enabled(is_css_js_injection_enabled);
  await config.set_is_purple_theme_enabled(is_purple_theme_enabled);

  // setup watchers
  const watcher = new Watcher(config);
  watcher.init_watchers();

  // setup sidebar
  let sidebarUiProvider = new SidebarProvider(config);
  context.subscriptions.push(
    vscode.window.registerWebviewViewProvider("SidebarUI", sidebarUiProvider, {
      webviewOptions: {
        retainContextWhenHidden: true,
      },
    }),
  );
}

export async function uninstall_extension(
  context: vscode.ExtensionContext,
): Promise<void> {
  let config = new Config(context);

  // init config
  const is_css_js_injection_enabled = await isCssJsInjectionEnabled(
    config.paths.workbench_html_file,
  );
  const is_purple_theme_enabled = await isFluentUIEnabled(
    config.paths.workbench_html_file,
  );
  await config.set_is_css_js_injection_enabled(is_css_js_injection_enabled);
  await config.set_is_purple_theme_enabled(is_purple_theme_enabled);
  await restore_workspace_to_clean(config);
}
