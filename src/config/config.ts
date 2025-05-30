import { ExtensionContext } from "vscode";
import { GlobalThis, Paths, States } from "./lib/types";
import * as vscode from "vscode";
import path from "path";
import { THEME_NAME } from "../utils/constants";
import { ConfigInterface } from "./lib/interfaces";

declare const globalThis: GlobalThis;

export class Config implements ConfigInterface {
  context: ExtensionContext;
  paths: Paths;
  states: States;
  extention_uri: vscode.Uri;
  public set_current_theme_json_path() {
    const new_them_json_path = this.get_current_theme_json_path();
    this.paths.current_theme_json = new_them_json_path;
    return new_them_json_path;
  }

  constructor(context: ExtensionContext) {
    const tempExtentionUri = this.get_extention_uri();
    const tempExtensionPath = tempExtentionUri.fsPath;
    const tempAppRoot = this.get_app_root_path();
    const tempVsCodeBase = path.join(tempAppRoot, "vs", "code");
    const tempWorkbenchHtmlFile = path.join(
      tempVsCodeBase,
      "electron-sandbox",
      "workbench",
      "workbench.html",
    );

    this.context = context;
    this.paths = {
      extension: tempExtensionPath,
      css_file: this.get_injectable_file_path(
        "custom.css",
        tempExtensionPath,
        "customs",
      ),
      js_file: this.get_injectable_file_path(
        "custom.js",
        tempExtensionPath,
        "customs",
      ),
      fluent_ui_css_file: this.get_injectable_file_path(
        "fluent-ui.css",
        tempExtensionPath,
        "customs",
      ),
      fluent_ui_css_dark_vars_file: this.get_injectable_file_path(
        "fluent-ui-dark-vars.css",
        tempExtensionPath,
        "customs",
      ),
      fluent_ui_js_file: this.get_injectable_file_path(
        "fluent-ui.js",
        tempExtensionPath,
        "customs",
      ),
      user_theme_vars_json_file: this.get_injectable_file_path(
        "user-theme-vars.json",
        tempExtensionPath,
        "data",
      ),
      fluent_ui_js_file_compiled: path.join(
        tempVsCodeBase,
        "electron-sandbox",
        "workbench",
        "fluent-ui-compiled.js",
      ),
      our_theme_json: path.join(
        tempExtensionPath,
        "themes",
        "purple-fluent-ui-color-theme.json",
      ),
      our_theme_json_backup: path.join(
        tempExtensionPath,
        "themes",
        "purple-fluent-ui-color-theme-backup.json",
      ),
      app_root: tempAppRoot,
      resources: path.join(tempExtensionPath, "resources"),
      images: path.join(tempExtensionPath, "resources", "images"),
      current_theme_json: this.get_current_theme_json_path(),
      vs_code_base: tempVsCodeBase,
      workbench_html_file: tempWorkbenchHtmlFile,
    };
    this.states = {
      is_purple_theme_enabled:
        vscode.workspace
          .getConfiguration("workbench")
          .get<string>("colorTheme") === THEME_NAME,
      is_css_js_injection_enabled: false,
    };
    this.extention_uri = tempExtentionUri;
  }

  public set_is_css_js_injection_enabled(isEnabled: boolean) {
    this.states.is_css_js_injection_enabled = isEnabled;
  }

  private get_injectable_file_path(
    filename: string,
    extention_path: string,
    subfolder: string,
  ) {
    const customPath = path.join(
      extention_path,
      "resources",
      subfolder,
      filename,
    );
    if (!vscode.workspace.fs.stat(vscode.Uri.file(customPath))) {
      vscode.window.showErrorMessage(`Custom file not found: ${customPath}`);
      throw new Error(`Custom file not found: ${customPath}`);
    }
    return customPath;
  }

  private get_extention_uri() {
    const extensionUri = vscode.extensions.getExtension(
      "Ali-Kabbadj.theme-editor-pro",
    )?.extensionUri;

    if (!extensionUri) {
      vscode.window.showErrorMessage("Could not locate extension URI");
      throw new Error("Could not locate extension URI");
    }
    return extensionUri;
  }

  private get_app_root_path() {
    return require.main
      ? path.dirname(require.main.filename)
      : globalThis._VSCODE_FILE_ROOT || "";
  }

  private get_current_theme_json_path() {
    const currentTheme = vscode.workspace
      .getConfiguration("workbench")
      .get<string>("colorTheme");
    if (currentTheme) {
      const extensions = vscode.extensions.all;
      for (const ext of extensions) {
        if (ext.packageJSON?.contributes?.themes) {
          const themes = ext.packageJSON.contributes.themes;
          const themeData = themes.find(
            (theme: any) =>
              theme.label === currentTheme || theme.id === currentTheme,
          );
          if (themeData) {
            return path.join(ext.extensionPath, themeData.path);
          }
        }
      }
    }
    return "";
  }
}
