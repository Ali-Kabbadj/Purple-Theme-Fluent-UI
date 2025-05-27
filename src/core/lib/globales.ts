import path from "path";
import { ExtentionConfig, Globals } from "./types";
import * as vscode from "vscode";
import { GlobalThis } from "./interfaces";

declare const globalThis: GlobalThis;

export const globals: Globals = {
  init_extention_config(extentionConfig: ExtentionConfig) {},
};
