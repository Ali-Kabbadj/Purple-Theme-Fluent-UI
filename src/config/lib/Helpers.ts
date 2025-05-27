import { Config } from "../config";
import * as fs from "fs";

export async function isCssJsInjectionEnabled(
  workbench_html_file_path: string,
) {
  try {
    const htmlContent = await fs.promises.readFile(
      workbench_html_file_path,
      "utf-8",
    );
    return htmlContent.includes("<!-- !! VSCODE-CUSTOM-CSS-START !! -->");
  } catch (e) {
    console.error("Error checking if custom CSS is installed:", e);
    return false;
  }
}
