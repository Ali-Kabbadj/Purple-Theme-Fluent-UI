export type Paths = {
  extension: string;
  css_file: string;
  js_file: string;
  fluent_ui_css_file: string;
  fluent_ui_css_dark_vars_file: string;
  fluent_ui_js_file: string;
  user_theme_vars_json_file: string;
  fluent_ui_js_file_compiled: string;
  app_root: string;
  resources: string;
  images: string;
  current_theme_json: string;
  our_theme_json: string;
  our_theme_json_backup: string;
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
