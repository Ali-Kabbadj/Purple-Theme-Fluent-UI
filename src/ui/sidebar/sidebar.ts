import * as vscode from "vscode";
import * as path from "path";
import * as fs from "fs";
// import { createLogger } from "../../utils/logger";
import { THEME_NAME } from "../../utils/constants";

// const logger = createLogger("CustomUiSidebarProvider");
/**
 * This class manages the sidebar view for the Purple Fluent UI Injector extension
 */
export class CustomUiSidebarProvider implements vscode.WebviewViewProvider {
  // Make sure this exactly matches the ID in package.json
  public static readonly viewType = "customUiSidebar";

  private _view?: vscode.WebviewView;
  private _extensionUri: vscode.Uri;
  private _cssPath: string = "";
  private _jsPath: string = "";
  private _isInjectionEnabled: boolean = false;
  private _isThemeEnabled: boolean = false;

  constructor(private readonly context: vscode.ExtensionContext) {
    this._extensionUri = context.extensionUri;
    console.log("CustomUiSidebarProvider initialized");

    // Check if our theme is currently active
    // Force sync with actual VS Code config on startup
    const currentTheme = vscode.workspace
      .getConfiguration("workbench")
      .get<string>("colorTheme");
    context.globalState.update(
      "themeEnabled",
      currentTheme === "Purple Theme Fluent-UI",
    );

    // Listen for configuration changes to update theme status
    vscode.workspace.onDidChangeConfiguration((e) => {
      if (e.affectsConfiguration("workbench.colorTheme")) {
        this._checkThemeStatus(true);
      }
    });
  }

  private _checkThemeStatus(force = false): void {
    const config = vscode.workspace.getConfiguration("workbench");
    const currentTheme = config.get<string>("colorTheme");
    const savedState = this.context.globalState.get<boolean>(
      "theme-editor-pro.themeEnabled",
      false,
    );

    // If saved state conflicts with actual theme, prioritize configuration
    if (force || currentTheme !== THEME_NAME) {
      this._isThemeEnabled = currentTheme === THEME_NAME;
      this.context.globalState.update(
        "theme-editor-pro.themeEnabled",
        this._isThemeEnabled,
      );
    }

    this._refreshWebview();
  }

  public updatePaths(cssPath: string, jsPath: string): void {
    this._cssPath = cssPath;
    this._jsPath = jsPath;
    this._refreshWebview();
    console.log("Paths updated:", { cssPath, jsPath });
  }

  public updateStatus(isEnabled: boolean): void {
    this._isInjectionEnabled = isEnabled;
    this._refreshWebview();
    console.log("Injection status updated:", isEnabled);
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
      localResourceRoots: [this._extensionUri],
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
          this._openFile(this._cssPath);
          break;
        case "openJsFile":
          this._openFile(this._jsPath);
          break;
        case "createCssFile":
          this._createFile(this._cssPath);
          break;
        case "createJsFile":
          this._createFile(this._jsPath);
          break;
        case "resetCssFile":
          this._resetFile(this._cssPath);
          break;
        case "resetJsFile":
          this._resetFile(this._jsPath);
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

  private _createFile(filePath: string): void {
    if (!filePath) {
      vscode.window.showErrorMessage("File path is not defined!");
      return;
    }

    if (fs.existsSync(filePath)) {
      vscode.window.showInformationMessage(`File already exists: ${filePath}`);
      return;
    }

    // Create directory if it doesn't exist
    const dirPath = path.dirname(filePath);
    if (!fs.existsSync(dirPath)) {
      fs.mkdirSync(dirPath, { recursive: true });
    }

    // Create empty file
    fs.writeFileSync(filePath, "");
    vscode.window.showInformationMessage(`Created new file: ${filePath}`);

    // Open the newly created file
    this._openFile(filePath);

    // Refresh webview to update button states
    this._refreshWebview();
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
    // Check if files exist
    const cssExists = this._cssPath && fs.existsSync(this._cssPath);
    const jsExists = this._jsPath && fs.existsSync(this._jsPath);

    // Create URI for the stylesheet
    const styleUri = webview.asWebviewUri(
      vscode.Uri.file(
        path.join(this._extensionUri.fsPath, "resources", "sidebar.css"),
      ),
    );

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
      </style>
    </head>
    <body>
      <div class="container">
        <div class="section">
          <div class="section-title">Color Theme Status</div>
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
        </div>

        <div class="section">
          <div class="section-title">Custom Files</div>
          <fieldset ${!this._isInjectionEnabled ? "disabled" : ""}>
            <div class="button-row">
              <button class="button main-button" id="openCssBtn" ${
                !cssExists ? "disabled" : ""
              }>
                Open Custom CSS File
              </button>
              <button class="button small-button" id="createCssBtn" title="Create File" ${
                cssExists ? "disabled" : ""
              }>
                +
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
              <button class="button small-button" id="createJsBtn" title="Create File" ${
                jsExists ? "disabled" : ""
              }>
                +
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
