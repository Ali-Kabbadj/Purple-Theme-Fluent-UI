import { ExtentionConfig } from './lib/types';
import * as vscode from "vscode";
import { globals } from "./lib/globales";

export function init_extension(context: vscode.ExtensionContext): void {
    let extentionConfig = new ExtentionConfig();
    globals.init_extention_config();
}

export function uninstall_extension(): void {}
