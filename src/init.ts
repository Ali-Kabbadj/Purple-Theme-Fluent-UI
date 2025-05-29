import * as vscode from "vscode";
import { Config } from "./config/config";
import { Logger } from "./utils/logger";
import { Watcher } from "./watcher/watcher";
import { isCssJsInjectionEnabled } from "./config/lib/Helpers";
import { SidebarProvider } from "./sidebar/sidebarProvider";

export function init_extension(context: vscode.ExtensionContext): void {
  const logger = new Logger("init_extension");
  let config = new Config(context);

  (async () => {
    // init config
    const isEnabled = await isCssJsInjectionEnabled(
      config.paths.workbench_html_file,
    );
    await config.set_is_css_js_injection_enabled(isEnabled);

    // setup watchers
    const watcher = new Watcher(config);
    watcher.init_watchers();

    // setup sidebar
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
