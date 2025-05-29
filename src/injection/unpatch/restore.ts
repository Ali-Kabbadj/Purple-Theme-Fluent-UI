import fs from "fs";
import { Config } from "../../config/config";
import path from "path";

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
}
