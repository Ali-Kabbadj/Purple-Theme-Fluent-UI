import * as vscode from "vscode";

// export type Globals = {
//   init_extention_config: (extentionConfig: ExtentionConfig) => void;
// };

export type Paths = {
  css_file: string;
  js_file: string;
  app_root: string;
  extension: string;
  resources: string;
  images: string;
  current_theme_json: string;
  vs_code_base: string;
  workbench_html_file: string;
};

export type States = {
  is_purple_theme_enabled: boolean;
  is_fluent_ui_enabled: boolean;
};

export interface ExtentionConfigInterface {
  context: vscode.ExtensionContext;
  paths: Paths;
  states: States;
}
