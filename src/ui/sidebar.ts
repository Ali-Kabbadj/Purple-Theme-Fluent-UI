import path from "path";
import * as vscode from "vscode";
import { Config } from "../config/config";
import * as fs from "fs";
import { create_clean_workspace_backup } from "../injection/unpatch/backup";
import { config } from "process";
import { patch_clean_workbench } from "../injection/patch";
import { restore_workspace_to_clean } from "../injection/unpatch/restore";

export class SidebarProvider implements vscode.WebviewViewProvider {
  public static readonly viewType = "SidebarUI";
  private _view?: vscode.WebviewView;
  private _isCssJsInjectionEnabled: boolean = false;
  private _isPurpleThemeEnabled: boolean = false;
  private _isFluentUIEnabeld: boolean = false;
  private _config: Config;

  constructor(confg: Config) {
    this._config = confg;
    this.initialize(confg);
    this._refreshWebview(confg);
  }

  private async initialize(confg: Config) {
    this._isCssJsInjectionEnabled = confg.states.is_css_js_injection_enabled;
    this._isPurpleThemeEnabled = confg.states.is_purple_theme_enabled;
    this._isFluentUIEnabeld = confg.states.is_fluent_ui_enabled;
  }

  private _refreshWebview(config: Config): void {
    if (this._view) {
      this._view.webview.html = this._getHtmlForWebview(this._view.webview);
      console.log("Webview refreshed");
    }
  }

  private async _promptRestart(message: string) {
    const choice = await vscode.window.showInformationMessage(
      message,
      "Restart Now",
    );
    if (choice === "Restart Now") {
      await vscode.commands.executeCommand("workbench.action.reloadWindow");
    }
  }

  public resolveWebviewView(
    webviewView: vscode.WebviewView,
    context: vscode.WebviewViewResolveContext,
    _token: vscode.CancellationToken,
  ): void | Thenable<void> {
    console.log("resolveWebviewView called");
    this._view = webviewView;

    // Configure webview
    webviewView.webview.options = {
      enableScripts: true,
      localResourceRoots: [this._config.extention_uri],
    };

    // Set initial HTML content
    webviewView.webview.html = this._getHtmlForWebview(webviewView.webview);

    // Handle messages from the webview
    webviewView.webview.onDidReceiveMessage(async (message) => {
      console.log("Message received from webview:", message);
      switch (message.command) {
        case "toggleInjectionEnabled":
          // Execute enable/disable command based on checkbox state
          message.value
            ? (async () => {
                await create_clean_workspace_backup(this._config);
                await patch_clean_workbench(this._config);
                await this._promptRestart(
                  "CSS/JS injection complete. Restart to finalize.",
                );
              })()
            : (async () => {
                await restore_workspace_to_clean(this._config);
                await this._promptRestart(
                  "CSS/JS injection removed. Restart to finalize.",
                );
              })();
          break;
      }
      //   switch (message.command) {
      //     case "toggleInjectionEnabled":
      //       // Execute enable/disable command based on checkbox state
      //       const injectionCommand = message.value
      //         ? "theme-editor-pro.installCssJsInjection"
      //         : "theme-editor-pro.uninstallCssJsInjection";
      //       vscode.commands.executeCommand(injectionCommand);
      //       break;
      //     case "toggleThemeEnabled":
      //       // Execute theme enable/disable command based on checkbox state
      //       const themeCommand = message.value
      //         ? "theme-editor-pro.enableTheme"
      //         : "theme-editor-pro.disableTheme";
      //       vscode.commands.executeCommand(themeCommand);
      //       break;
      //     case "openCssFile":
      //       this._openFile(globals.extentionConfig?.cssUri || "");
      //       break;
      //     case "openJsFile":
      //       this._openFile(globals.extentionConfig?.jsUri || "");
      //       break;
      //     case "resetCssFile":
      //       this._resetFile(globals.extentionConfig?.cssUri || "");
      //       break;
      //     case "resetJsFile":
      //       this._resetFile(globals.extentionConfig?.jsUri || "");
      //       break;
      //     case "openThemeFile":
      //       this._openFile(globals.currentThemeJsonPath || "");
      //       break;
      //   }
    });
  }

  private _openFile(filePath: string): void {
    if (!filePath) {
      vscode.window.showErrorMessage("File path is not defined!");
      return;
    }

    if (!fs.existsSync(filePath)) {
      vscode.window.showErrorMessage(`File does not exist: ${filePath}`);
      return;
    }

    vscode.workspace.openTextDocument(filePath).then((document) => {
      vscode.window.showTextDocument(document);
    });
  }

  private _resetFile(filePath: string): void {
    if (!filePath) {
      vscode.window.showErrorMessage("File path is not defined!");
      return;
    }

    if (!fs.existsSync(filePath)) {
      vscode.window.showErrorMessage(`File does not exist: ${filePath}`);
      return;
    }

    // Show confirmation dialog
    vscode.window
      .showWarningMessage(
        `Are you sure you want to clear the contents of ${path.basename(
          filePath,
        )}?`,
        "Yes",
        "No",
      )
      .then((selection) => {
        if (selection === "Yes") {
          fs.writeFileSync(filePath, "");
          vscode.window.showInformationMessage(`Reset file: ${filePath}`);
        }
      });
  }

  private _getHtmlForWebview(webview: vscode.Webview): string {
    const cssExists = fs.existsSync(this._config.paths.css_file);
    const jsExists = fs.existsSync(this._config.paths.js_file);

    return `<!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <style>
        body {
          padding: 16px;
          color: var(--vscode-foreground);
          font-family: var(--vscode-font-family);
          background-color: transparent;
        }
        .container {
          display: flex;
          flex-direction: column;
          gap: 16px;
        }
        .header {
          font-size: 16px;
          font-weight: bold;
          margin-bottom: 8px;
        }
        .button {
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 8px 16px;
          background-color: var(--vscode-button-background);
          color: var(--vscode-button-foreground);
          border: none;
          border-radius: 8px;
          cursor: pointer;
          font-size: 13px;
          font-weight: 500;
          margin-top: 8px;
          width: 100%;
          max-height: 50px;
        }
        .button:hover {
          background-color: var(--vscode-button-hoverBackground);
        }
        .button:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }
        .button:disabled:hover {
          background-color: var(--vscode-button-background);
        }
        .button-row {
          display: flex;
          gap: 8px;
          margin-top: 8px;
        }
        .small-button {
          flex: 0 0 auto;
          padding: 8px;
          min-width: 25px;
          font-size: 12px;
          max-width: 50px;
          min-height: 25px;
          max-height: 50px;
        }
        .main-button {
          flex: 1;
        }
        .checkbox-container {
          display: flex;
          align-items: center;
          padding: 8px 0;
        }
        .checkbox-container input {
          margin-right: 8px;
        }
        .note {
          font-size: 12px;
          margin-top: 2px;
          color: var(--vscode-descriptionForeground);
        }
        .note-important {
          font-size: 12px;
          margin-top: 2px;
          color: red;
        }
        .section {
          border: 1px solid var(--vscode-foreground);
          border-radius: 8px;
          padding: 12px;
          margin-bottom: 16px;
        }
        .section-title {
          font-weight: bold;
          margin-bottom: 8px;
        }
        fieldset{
          border: 0px;
        }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="section">
          <div class="note">⚠️ IMPORTANT INSTRUCTIONS:</div>
            <div class="note-important">
            🎯 Its best to enable one at a time and restart as to not mess up the workbench.html, should be handled by default but just in case.
            </div>
            <div class="note-important">
          🎯 Make sure to run vscode with administrator privileges whenever you want to edit something, overiding the default     workbench.html requires it.
          </div>
        </div>
        <div class="section">
          <div class="checkbox-container">
            <input type="checkbox" id="toggleThemeEnabled" ${
              this._isPurpleThemeEnabled ? "checked" : ""
            } />
            <label for="toggleThemeEnabled">${
              this._isPurpleThemeEnabled ? "Disable" : "Enable"
            } Purple Fluent UI Theme</label>
          </div>
          <div class="note">
            Toggle to enable/disable the Purple Fluent UI color theme.
          </div>
        </div>

        <div class="section">
          <div class="button-row">
            <button class="button" id="openThemeBtn" ${
              !this._config.paths.current_theme_json ||
              !fs.existsSync(this._config.paths.current_theme_json)
                ? "disabled"
                : ""
            }>
                Open Current JSON Theme File
            </button>
          </div>
          <div class="note">
            Opens the JSON file of the currently active VS Code theme.
          </div>
        </div>

        <div class="section">
          <div class="checkbox-container">
            <input type="checkbox" id="toggleInjectionEnabled" ${
              this._isCssJsInjectionEnabled ? "checked" : ""
            } />
            <label for="toggleInjectionEnabled">${
              this._isCssJsInjectionEnabled ? "Disable" : "Enable"
            }} CSS/JS Injection</label>
          </div>
          <div class="note">
            Toggle to enable injection of your custom CSS/JS.
          </div>
          <div>
            <fieldset ${!this._isCssJsInjectionEnabled ? "disabled" : ""}>
              <div class="note">
                Open and Edit the custom CSS/JS files below, it will auto prompt you to restart when a change is detected in those files one save, or instantly if you have autosave enabled.
              </div>
              <div class="note">
                Use the refresh buttons to reset the files.
              </div>
              <div class="button-row">
                <button class="button main-button" id="openCssBtn" ${
                  !cssExists ? "disabled" : ""
                }>
                  Open Custom CSS File
                </button>
                <button class="button small-button" id="resetCssBtn" title="Reset File" ${
                  !cssExists ? "disabled" : ""
                }>
                  ⟲
                </button>
              </div>

              <div class="button-row">
                <button class="button main-button" id="openJsBtn" ${
                  !jsExists ? "disabled" : ""
                }>
                  Open Custom JS File
                </button>

                <button class="button small-button" id="resetJsBtn" title="Reset File" ${
                  !jsExists ? "disabled" : ""
                }>
                  ⟲
                </button>
              </div>
            </fieldset>
          </div>
        </div>
      </div>

      <script>
        (function() {
          const vscode = acquireVsCodeApi();

          document.getElementById('toggleInjectionEnabled').addEventListener('change', (e) => {
            vscode.postMessage({
              command: 'toggleInjectionEnabled',
              value: e.target.checked
            });
          });
          
          document.getElementById('toggleThemeEnabled').addEventListener('change', (e) => {
            vscode.postMessage({
              command: 'toggleThemeEnabled',
              value: e.target.checked
            });
          });

          document.getElementById('openCssBtn').addEventListener('click', () => {
            vscode.postMessage({
              command: 'openCssFile'
            });
          });

          document.getElementById('openJsBtn').addEventListener('click', () => {
            vscode.postMessage({
              command: 'openJsFile'
            });
          });

          document.getElementById('resetCssBtn').addEventListener('click', () => {
            vscode.postMessage({
              command: 'resetCssFile'
            });
          });

          document.getElementById('resetJsBtn').addEventListener('click', () => {
            vscode.postMessage({
              command: 'resetJsFile'
            });
          });

          document.getElementById('openThemeBtn').addEventListener('click', () => {
            vscode.postMessage({
              command: 'openThemeFile'
            });
          });
        })();
      </script>
    </body>
    </html>`;
  }
}
