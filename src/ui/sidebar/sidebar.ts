import * as vscode from "vscode";
import * as path from "path";
import * as fs from "fs";
import { globals } from "../../core/lib/globales";

export class SidebarUiProvider implements vscode.WebviewViewProvider {
  public static readonly viewType = "customUiSidebar";

  private _view?: vscode.WebviewView;
  private _isInjectionEnabled: boolean = false;
  private _isThemeEnabled: boolean = false;

  constructor() {
    globals.isCustomCssJSInstalled().then((isEnabled) => {
      this._isInjectionEnabled = isEnabled;
      this._refreshWebview();
    });
    this._isThemeEnabled = globals.purpleThemeFluentUIThemeStatus;
    console.log("SidebarUiProvider initialized");
  }

  public updateCssJsInjectorStatus(isEnabled: boolean): void {
    this._isInjectionEnabled = isEnabled;
    this._refreshWebview();
    console.log("Injection status updated:", isEnabled);
  }

  public updatePurpleThemeFuientUIStatus(isEnabled: boolean): void {
    this._isThemeEnabled = isEnabled;
    this._refreshWebview();
    console.log("Theme status updated:", isEnabled);
  }

  private _refreshWebview(): void {
    if (this._view) {
      this._view.webview.html = this._getHtmlForWebview(this._view.webview);
      console.log("Webview refreshed");
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
      localResourceRoots: [
        globals.extentionConfig?.extensionUri || vscode.Uri.file(""),
      ],
    };

    // Set initial HTML content
    webviewView.webview.html = this._getHtmlForWebview(webviewView.webview);

    // Handle messages from the webview
    webviewView.webview.onDidReceiveMessage(async (message) => {
      console.log("Message received from webview:", message);
      switch (message.command) {
        case "toggleInjectionEnabled":
          // Execute enable/disable command based on checkbox state
          const injectionCommand = message.value
            ? "theme-editor-pro.installCssJsInjection"
            : "theme-editor-pro.uninstallCssJsInjection";
          vscode.commands.executeCommand(injectionCommand);
          break;
        case "toggleThemeEnabled":
          // Execute theme enable/disable command based on checkbox state
          const themeCommand = message.value
            ? "theme-editor-pro.enableTheme"
            : "theme-editor-pro.disableTheme";
          vscode.commands.executeCommand(themeCommand);
          break;
        case "openCssFile":
          this._openFile(globals.extentionConfig?.cssUri || "");
          break;
        case "openJsFile":
          this._openFile(globals.extentionConfig?.jsUri || "");
          break;
        case "resetCssFile":
          this._resetFile(globals.extentionConfig?.cssUri || "");
          break;
        case "resetJsFile":
          this._resetFile(globals.extentionConfig?.jsUri || "");
          break;
      }
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
    const cssExists = fs.existsSync(globals.extentionConfig?.cssUri || "");
    const jsExists = fs.existsSync(globals.extentionConfig?.jsUri || "");

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
          border-radius: 4px;
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
        .file-status {
          font-size: 12px;
          margin-top: 2px;
          color: var(--vscode-descriptionForeground);
        }
        .file-status.error {
          color: var(--vscode-errorForeground);
        }
        .section {
          border: 1px solid var(--vscode-panel-border);
          border-radius: 4px;
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
          <div class="checkbox-container">
            <input type="checkbox" id="toggleThemeEnabled" ${
              this._isThemeEnabled ? "checked" : ""
            } />
            <label for="toggleThemeEnabled">Enable Purple Fluent UI Theme</label>
          </div>
          <div class="file-status">
            Toggle to enable/disable the Purple Fluent UI color theme.
          </div>
        </div>

        <div class="section">
          <div class="section-title">Custom CSS/JS Injection</div>
          <div class="checkbox-container">
            <input type="checkbox" id="toggleInjectionEnabled" ${
              this._isInjectionEnabled ? "checked" : ""
            } />
            <label for="toggleInjectionEnabled">Enable CSS/JS Injection</label>
          </div>
          <div class="file-status">
            Toggle to enable injection of your custom CSS/JS. Changes will reload the window.
          </div>
          <div>
            <fieldset ${!this._isInjectionEnabled ? "disabled" : ""}>
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

          document.getElementById('createCssBtn').addEventListener('click', () => {
            vscode.postMessage({
              command: 'createCssFile'
            });
          });

          document.getElementById('createJsBtn').addEventListener('click', () => {
            vscode.postMessage({
              command: 'createJsFile'
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
        })();
      </script>
    </body>
    </html>`;
  }
}
