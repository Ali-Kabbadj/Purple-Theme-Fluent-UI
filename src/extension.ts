import * as vscode from "vscode";
import { init_extension, deactivate_extension } from "./core/base";
import { THEME_NAME } from "./core/lib/constants";

export async function activate(context: vscode.ExtensionContext) {
  init_extension(context);
}

export function deactivate() {
  deactivate_extension();
}
