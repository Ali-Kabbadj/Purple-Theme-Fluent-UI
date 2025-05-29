import { config } from "process";
import { Config } from "../config/config";
import path from "path";
import fs, { constants } from "fs";
import * as vscode from "vscode";
import {
  IS_COMPACT,
  THEME_ACCENT,
  THEME_DARK_BACKGROUND,
  THEME_LIGHT_BACKGROUND,
  THEME_NAME,
} from "../utils/constants";
import { restore_workspace_to_clean } from "../injection/unpatch/restore";
import { create_clean_workspace_backup } from "../injection/unpatch/backup";
import {
  get_file_content,
  parse_path_to_valid_url,
} from "../injection/lib/path_url_helpers";
import * as Url from "url";
import {
  apply_patches,
  put_file_content_in_appropriate_tag,
} from "../injection/patch";
import { FetchInternalCss } from "./internal-css/internals";

export async function patch_clean_workbench_with_purple_fluent_ui(
  config: Config,
) {
  // set workspace theme
  await set_workspace_theme(THEME_NAME);

  //first we check if there is a backup file, if so we restore to default
  const cleanWorkspaceFilePath = path.join(
    config.paths.vs_code_base,
    "electron-sandbox",
    "workbench",
    `workbench.html.bak`,
  );
  try {
    await fs.promises.access(
      cleanWorkspaceFilePath,
      constants.R_OK | constants.W_OK,
    );
    // if no error -> clean backup exists -> restore clean
    await restore_workspace_to_clean(config);
  } catch {
    // error -> no clean file -> we just catch it and continue
  }
  await create_clean_workspace_backup(config);
  const cleanWorkspaceFile = await fs.promises.readFile(
    cleanWorkspaceFilePath,
    "utf-8",
  );
  const patches = await get_all_fluent_ui_patches(config);
  await configure_fluent_ui_js_file_vars(config);
  await apply_patches(config, patches, cleanWorkspaceFile);
}

async function get_all_fluent_ui_patches(config: Config) {
  const css = await get_combined_custom_css_fluent_ui_css(config);

  const js = await get_combined_js_patches(config);

  return (
    "<!-- !! FLUENT-UI-AND-CUSTOM-CSS-JS-START !! -->\n" +
    css +
    "\n" +
    js +
    "\n" +
    `<script src="fluent-ui-compiled.js"></script>\n` +
    "<!-- !! FLUENT-UI-AND-CUSTOM-CSS-JS-START !! -->\n</html>"
  );
}

export async function set_workspace_theme(theme_name: string) {
  const vscode_config = vscode.workspace.getConfiguration("workbench");
  await vscode_config.update(
    "colorTheme",
    theme_name,
    vscode.ConfigurationTarget.Global,
  );
}

async function get_combined_custom_css_fluent_ui_css(config: Config) {
  let custom_css_file_url = new Url.URL(config.paths.css_file);
  let fluent_ui_css_file_url = new Url.URL(config.paths.fluent_ui_css_file);

  custom_css_file_url = parse_path_to_valid_url(
    config.paths.css_file,
  ) as unknown as URL;
  fluent_ui_css_file_url = parse_path_to_valid_url(
    config.paths.fluent_ui_css_file,
  ) as unknown as URL;
  const fetched_custom_css = await get_file_content(custom_css_file_url);
  const fetched_fluent_ui_css = await get_file_content(fluent_ui_css_file_url);
  const internalFetched = await FetchInternalCss();

  return `<style> ${fetched_fluent_ui_css} ${internalFetched} ${fetched_custom_css}</style>`;
}

async function get_combined_js_patches(config: Config) {
  let custom_js_file_url = new Url.URL(config.paths.js_file);
  custom_js_file_url = parse_path_to_valid_url(
    config.paths.js_file,
  ) as unknown as URL;
  const fetched_custom_js_file = await get_file_content(config.paths.js_file);
  return `<script>${fetched_custom_js_file} </script>`;
}

async function configure_fluent_ui_js_file_vars(config: Config) {
  let fluent_ui_js_file_url = new Url.URL(config.paths.css_file);
  fluent_ui_js_file_url = parse_path_to_valid_url(
    config.paths.fluent_ui_js_file,
  ) as unknown as URL;
  const fetched_fluent_ui_js = await get_file_content(fluent_ui_js_file_url);

  const isCompact = IS_COMPACT;
  const accent = THEME_ACCENT;
  const darkBgColor = THEME_DARK_BACKGROUND;
  const lightBgColor = THEME_LIGHT_BACKGROUND;

  let jsStringBuffer = fetched_fluent_ui_js.toString();

  jsStringBuffer = jsStringBuffer.replace(/\[IS_COMPACT\]/g, String(isCompact));
  jsStringBuffer = jsStringBuffer.replace(/\[LIGHT_BG\]/g, `"${lightBgColor}"`);
  jsStringBuffer = jsStringBuffer.replace(/\[DARK_BG\]/g, `"${darkBgColor}"`);
  jsStringBuffer = jsStringBuffer.replace(/\[ACCENT\]/g, `"${accent}"`);

  await fs.promises.writeFile(
    config.paths.fluent_ui_js_file_compiled,
    jsStringBuffer,
  );
  return;
}
