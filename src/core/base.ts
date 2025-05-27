import * as vscode from "vscode";
import { ExtentionConfig } from "./Models/ExtentionConfig";
import { Logger } from "../utils/logger";

export function init_extension(context: vscode.ExtensionContext): void {
  const logger = new Logger("init_extension");
  let extentionConfig = new ExtentionConfig(context);
  logger.config("extentionConfig", extentionConfig);
}

export function uninstall_extension(): void {}
