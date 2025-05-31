import { Config } from "./../config/config";
import path from "path";
import fs, { constants } from "fs";
import * as Url from "url";
import {
  get_file_content,
  parse_path_to_valid_url,
} from "./lib/path_url_helpers";
import { create_clean_workspace_backup } from "./unpatch/backup";
import { restore_workspace_to_clean } from "./unpatch/restore";

export async function patch_clean_workbench(config: Config) {
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
  const patches = await get_all_patches(config);
  await apply_patches(config, patches, cleanWorkspaceFile);
}

export async function apply_patches(
  config: Config,
  patches: string,
  cleanWorkspaceFile: string,
) {
  // remove Content-Security-Policy
  const workspaceFileNoPolicy = cleanWorkspaceFile.replace(
    /<meta\s+http-equiv="Content-Security-Policy"[\s\S]*?\/>/,
    "",
  );

  const patchedWorkspaceFile = workspaceFileNoPolicy.replace(
    /(<\/html>)/,
    "<!-- !! CUSTOM-CSS-JS-START !! -->\n" +
      patches +
      "<!-- !! CUSTOM-CSS-JS-END !! -->\n</html>",
  );
  await fs.promises.writeFile(
    config.paths.workbench_html_file,
    patchedWorkspaceFile,
    "utf-8",
  );
}

async function get_all_patches(config: Config) {
  let res = "";
  res += await put_file_content_in_appropriate_tag(config.paths.css_file);
  res += await put_file_content_in_appropriate_tag(config.paths.js_file);
  return res;
}

export async function put_file_content_in_appropriate_tag(file_path: string) {
  let file_url = new Url.URL(file_path);
  const ext = path.extname(file_url.pathname);

  file_url = parse_path_to_valid_url(file_path) as unknown as URL;
  const fetched = await get_file_content(file_url);
  //   const internalFetched = await FetchInternalCss();
  //${internalFetched}
  if (ext === ".css") {
    return `<style>  ${fetched} </style>`;
  } else if (ext === ".js") {
    return `<script>${fetched}</script>`;
  }
}
