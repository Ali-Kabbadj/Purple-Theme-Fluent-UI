import { Paths, States } from "./types";
import * as vscode from "vscode";

export interface ConfigInterface {
  context: vscode.ExtensionContext;
  paths: Paths;
  states: States;
  extention_uri: vscode.Uri;
  set_current_theme_json_path: () => string;
}
