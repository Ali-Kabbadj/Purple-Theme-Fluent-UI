import fs from "fs";
import { Config } from "../../config/config";
import path from "path";
import { remove_custom_settings } from "../../purple-fluent-ui/internal-css/settings/handle-add-remove-settings";
import { reset_theme_to_backup } from "../../purple-fluent-ui/internal-css/settings/handle-theme-vars-set-reset";

export async function restore_workspace_to_clean(config: Config) {
  const cleanWorkspaceFilePath = path.join(
    config.paths.vs_code_base,
    "electron-sandbox",
    "workbench",
    `workbench.html.bak`,
  );
  await fs.promises.copyFile(
    cleanWorkspaceFilePath,
    config.paths.workbench_html_file,
  );
  await fs.promises.unlink(cleanWorkspaceFilePath);
  await reset_theme_to_backup(config);
}
