import { ExtensionContext } from "vscode";
import { ExtentionConfigInterface, Paths, States } from "./types";
import * as vscode from "vscode";

export class ExtentionConfig implements ExtentionConfigInterface {
  context: ExtensionContext;
  paths: Paths;
  states: States;

  // creates inits for paths and states
  constructor(context: ExtensionContext) {
    this.context = context;
    this.paths = {
      extension_uri: this.get_extention_path(),
      css_file: "",
      js_file: "",
      app_root: "",
      resources: "",
      images: "",
      current_theme_json: "",
      vs_code_base: "",
      workbench_html_file: "",
    };
    this.states = {
      is_purple_theme_enabled: false,
      is_fluent_ui_enabled: false,
    };
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

  
}
