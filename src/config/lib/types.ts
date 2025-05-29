export type Paths = {
  css_file: string;
  js_file: string;
  fluent_ui_css_file: string;
  fluent_ui_js_file: string;
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
  is_css_js_injection_enabled: boolean;
};

export interface GlobalThis {
  _VSCODE_FILE_ROOT?: string;
}
