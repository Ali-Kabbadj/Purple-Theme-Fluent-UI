import * as vscode from "vscode";

export interface VSCodeCustomCssConfig {
  imports: string[];
  extensionUri: vscode.Uri;
  cssUri: string;
  jsUri: string;
}
