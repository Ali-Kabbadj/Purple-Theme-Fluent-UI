import * as vscode from "vscode";
import { Config } from "../config/config";
import { Logger } from "../utils/logger";
import { Watcher } from "../watcher/watcher";
import { SidebarProvider } from "../ui/sidebar";
import { patch_clean_workbench } from "../injection/patch";
import { isCssJsInjectionEnabled } from "../config/lib/Helpers";

export function init_extension(context: vscode.ExtensionContext): void {
  const logger = new Logger("init_extension");
  let config = new Config(context);

  (async () => {
    const isEnabled = await isCssJsInjectionEnabled(
      config.paths.workbench_html_file,
    );
    await config.set_is_css_js_injection_enabled(isEnabled);

    // Move the rest of the initialization here
    const watcher = new Watcher(config);
    watcher.init_watchers();

    let sidebarUiProvider = new SidebarProvider(config);
    context.subscriptions.push(
      vscode.window.registerWebviewViewProvider(
        "SidebarUI",
        sidebarUiProvider,
        {
          webviewOptions: {
            retainContextWhenHidden: true,
          },
        },
      ),
    );
  })();
}

export function uninstall_extension(): void {}
