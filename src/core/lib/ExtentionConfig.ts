import { ExtensionContext } from "vscode";
import { ExtentionConfigInterface, Paths, States } from "./types";
import * as vscode from "vscode";
import path from "path";
import { THEME_NAME } from "./constants";

export class ExtentionConfig implements ExtentionConfigInterface {
  context: ExtensionContext;
  paths: Paths;
  states: States;

  constructor(context: ExtensionContext) {
    const tempExtensionPath = this.get_extention_path().fsPath;
    const tempAppRoot = this.get_app_root_path();
    const tempVsCodeBase = path.join(tempAppRoot, "vs", "code");

    // init config
    this.context = context;
    this.paths = {
      extension: tempExtensionPath,
      css_file: this.get_custom_path("custom.css", tempExtensionPath),
      js_file: this.get_custom_path("custom.js", tempExtensionPath),
      app_root: tempAppRoot,
      resources: path.join(tempExtensionPath, "resources"),
      images: path.join(tempExtensionPath, "resources", "images"),
      current_theme_json: this.get_current_theme_json_path(),
      vs_code_base: tempVsCodeBase,
      workbench_html_file: path.join(
        tempVsCodeBase,
        "electron-sandbox",
        "workbench",
        "workbench.html",
      ),
    };
    this.states = {
      is_purple_theme_enabled:
        vscode.workspace
          .getConfiguration("workbench")
          .get<string>("colorTheme") === THEME_NAME,
      is_fluent_ui_enabled: false,
    };
  }

  private get_custom_path(filename: string, extention_path: string) {
    const customPath = path.join(
      extention_path,
      "resources",
      "custom",
      filename,
    );
    if (!vscode.workspace.fs.stat(vscode.Uri.file(customPath))) {
      vscode.window.showErrorMessage(`Custom file not found: ${customPath}`);
      throw new Error(`Custom file not found: ${customPath}`);
    }
    return customPath;
  }

  private get_extention_path() {
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
    return path.dirname(require.main?.filename || process.cwd());
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
