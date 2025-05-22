import * as vscode from "vscode";
import { SidebarUiProvider } from "../../ui/sidebar/sidebar";
import fs from "fs";
import { GlobalThis } from "./interfaces";

export type Globals = {
  app_dir: string | undefined;
  vs_code_base: string | undefined;
  sidebarUiProvider: SidebarUiProvider | undefined;
  htmlFilePath: fs.PathLike | undefined;
  context: vscode.ExtensionContext | undefined;
  extentionConfig: VSCodeCustomCssConfig | undefined;
  globalGlobalThis: GlobalThis;
  purpleThemeFluentUIThemeStatus: boolean;
  currentThemeJsonPath: string | undefined;
  currentThemeWatcher: fs.FSWatcher | undefined;
  configWatcher: vscode.Disposable | undefined;
  init: (context: vscode.ExtensionContext) => void;
  isCustomCssJSInstalled: () => Promise<boolean>;
  initWatchers: () => Promise<void>;
  updateCurrentThemeJsonPath: () => void;
  setupThemeFileWatcher: () => void;
  refreshTheme: () => void;
};

export interface VSCodeCustomCssConfig {
  imports: string[];
  extensionUri: vscode.Uri;
  cssUri: string;
  jsUri: string;
  resourcesPath: string;
  imagesPath: string;
}
