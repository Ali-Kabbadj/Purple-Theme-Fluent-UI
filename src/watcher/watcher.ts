import { Config } from "../config/config";
import { WatcherInterface } from "./lib/interfaces";
import * as fs from "fs";
import * as vscode from "vscode";

export class Watcher implements WatcherInterface {
  private config: Config;
  private current_theme_json_file_changed_watcher: fs.FSWatcher | null = null;

  constructor(config: Config) {
    this.config = config;
  }

  init_watchers() {
    this.init_custom_css_file_changed_watcher(this.config);
    this.init_custom_js_file_changed_watcher(this.config);
    this.init_current_workspace_theme_changed_watcher(this.config);
    this.init_new_theme_json_file_changed_watcher(this.config);
  }

  //   private
  private init_current_workspace_theme_changed_watcher(config: Config) {
    const current_workspace_theme_changed_watcher =
      vscode.workspace.onDidChangeConfiguration((e) => {
        if (e.affectsConfiguration("workbench.colorTheme")) {
          const prev_them = config.paths.current_theme_json;
          const new_theme = config.set_current_theme_json_path();
          // on setup new wathcer if the theme has actually changed
          if (prev_them !== new_theme) {
            console.log(
              "[init_current_workspace_theme_changed_watcher] current theme changed",
            );
            console.log(`form:  (${prev_them})`);
            console.log(`to: (${new_theme})`);
            this.init_new_theme_json_file_changed_watcher(config);
          }
          // Update sidebar to reflect new theme
          // this.sidebarUiProvider?.updatePurpleThemeFuientUIStatus(
          //   vscode.workspace
          //     .getConfiguration("workbench")
          //     .get<string>("colorTheme") === THEME_NAME,
          // );
        }
      });
    this.config.context.subscriptions.push(
      current_workspace_theme_changed_watcher,
    );
  }

  private init_new_theme_json_file_changed_watcher(config: Config) {
    if (this.current_theme_json_file_changed_watcher) {
      this.current_theme_json_file_changed_watcher.close();
      this.current_theme_json_file_changed_watcher = null;
    }
    // Set up new watcher if theme file exists
    if (
      config.paths.current_theme_json !== "" &&
      fs.existsSync(config.paths.current_theme_json)
    ) {
      try {
        this.current_theme_json_file_changed_watcher = fs.watch(
          config.paths.current_theme_json,
          { encoding: "utf-8" },
          async (eventType, filename) => {
            console.log(
              `[current_theme_json_file_changed_watcher] Theme file (${filename}) changed (${eventType})`,
            );
            // to do : prompt user to restart
          },
        );
      } catch (err) {
        console.error("Failed to watch theme file:", err);
      }
    }
  }

  private init_custom_css_file_changed_watcher(config: Config) {
    fs.watch(
      config.paths.css_file,
      { encoding: "utf-8" },
      async (eventType, filename) => {
        console.log(
          `[custom_css_file_changed_watcher] (${filename}) changed (${eventType})`,
        );
        //   to do:
        // 1 - remove css js injection by restoring defautl wrokbench
        // 2 - if fluent ui was enabled before we need to re-apply it
        // 3 - we re-inject the css/js and we prompt user to restart
      },
    );
  }

  private init_custom_js_file_changed_watcher(config: Config) {
    fs.watch(
      config.paths.js_file,
      { encoding: "utf-8" },
      async (eventType, filename) => {
        console.log(
          `[custom_js_file_changed_watcher] (${filename}) changed (${eventType})`,
        );
        //   to do:
        // 1 - remove css js injection by restoring defautl wrokbench
        // 2 - if fluent ui was enabled before we need to re-apply it
        // 3 - we re-inject the css/js and we prompt user to restart
      },
    );
  }
}
