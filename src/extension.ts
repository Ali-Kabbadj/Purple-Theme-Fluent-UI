import * as vscode from "vscode";
import { init_extension, uninstall_extension } from "./init";

export async function activate(context: vscode.ExtensionContext) {
  await init_extension(context);
}

export async function deactivate(context: vscode.ExtensionContext) {
  // await uninstall_extension(context);
}
