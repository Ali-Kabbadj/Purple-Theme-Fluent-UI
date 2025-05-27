import * as vscode from "vscode";
import { init_extension, uninstall_extension } from "./core/base";

export async function activate(context: vscode.ExtensionContext) {
  init_extension(context);
}

export function deactivate() {
  uninstall_extension();
}
