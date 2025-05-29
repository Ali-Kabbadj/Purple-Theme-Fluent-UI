import fs from "fs";
import { Config } from "../../config/config";
import path from "path";

export async function create_clean_workspace_backup(config: Config) {
  const workbenchHTML = await fs.promises.readFile(
    config.paths.workbench_html_file,
  );
  const cleanWorkspaceFilePath = path.join(
    config.paths.vs_code_base,
    "electron-sandbox",
    "workbench",
    `workbench.html.bak`,
  );
  await fs.promises.writeFile(cleanWorkspaceFilePath, workbenchHTML, "utf-8");
}
