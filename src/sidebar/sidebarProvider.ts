import path from "path";
import * as vscode from "vscode";
import { Config } from "../config/config";
import * as fs from "fs";
import { create_clean_workspace_backup } from "../injection/unpatch/backup";
import { config } from "process";
import { patch_clean_workbench } from "../injection/patch";
import { restore_workspace_to_clean } from "../injection/unpatch/restore";
import {
  patch_clean_workbench_with_purple_fluent_ui,
  set_workspace_theme,
} from "../purple-fluent-ui/patch";
import { prompt_full_restart, prompt_restart } from "../messaging/user_prompts";
import {
  IS_COMPACT,
  THEME_ACCENT,
  THEME_BACKGROUND,
  THEME_DARK_BACKGROUND,
  THEME_LIGHT_BACKGROUND,
} from "../utils/constants";
import {
  getUserThemeVar,
  updateUserThemeVar,
  UserThemeVars,
} from "../purple-fluent-ui/user-vars/handle_user_vars";

export class SidebarProvider implements vscode.WebviewViewProvider {
  public static readonly viewType = "SidebarUI";
  private _view?: vscode.WebviewView;
  private _isCssJsInjectionEnabled: boolean = false;
  private _isPurpleThemeEnabled: boolean = false;
  private _config: Config;

  constructor(confg: Config) {
    this._config = confg;
    this.initialize(confg);
    this._refreshWebview(confg);
  }

  private async initialize(confg: Config) {
    this._isCssJsInjectionEnabled = confg.states.is_css_js_injection_enabled;
    this._isPurpleThemeEnabled = confg.states.is_purple_theme_enabled;
  }

  private _refreshWebview(config: Config): void {
    if (this._view) {
      this._view.webview.html = this._getHtmlForWebview(this._view.webview);
      console.log("Webview refreshed");
    }
  }

  private async _reset_user_vars_config() {
    await this._udpate_user_vars_config("compact", IS_COMPACT);
    await this._udpate_user_vars_config("accent", THEME_ACCENT);
    await this._udpate_user_vars_config("dark-color", THEME_DARK_BACKGROUND);
    await this._udpate_user_vars_config("background", THEME_BACKGROUND);
  }

  // Helper method to update VS Code settings
  private async _udpate_user_vars_config(
    key: string,
    value: any,
  ): Promise<void> {
    const settingKey = key.replace(
      "theme-editor-pro.",
      "",
    ) as keyof UserThemeVars;
    await updateUserThemeVar(this._config, settingKey, value);
  }

  // Helper method to get current VS Code setting value
  private _get_user_vars_config(key: string, defaultValue: any): any {
    const settingKey = key.replace(
      "theme-editor-pro.",
      "",
    ) as keyof UserThemeVars;
    return getUserThemeVar(this._config, settingKey, defaultValue);
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
                await prompt_restart(
                  "CSS/JS injection complete. Restart to finalize.",
                );
              })()
            : (async () => {
                await restore_workspace_to_clean(this._config);
                await prompt_restart(
                  "CSS/JS injection removed. Restart to finalize.",
                );
              })();
          break;
        case "toggleThemeEnabled":
          message.value
            ? (async () => {
                await patch_clean_workbench_with_purple_fluent_ui(this._config);
                await prompt_restart("Fluent UI Applied! Restart to finalize.");
              })()
            : (async () => {
                await set_workspace_theme("Default Dark Modern");
                await restore_workspace_to_clean(this._config);
                await prompt_restart("Fluent UI Removed! Restart to finalize.");
              })();
          break;
        case "resetThemeEditorSetting":
          await this._reset_user_vars_config();
          await patch_clean_workbench_with_purple_fluent_ui(this._config);
          await prompt_full_restart(
            "Theme Editor Pro settings were reset! Restart to see changes. For some changed to fully apply vscode needs to be fully closed and reopened",
          );
          break;
        case "updateThemeEditorSetting":
          await this._udpate_user_vars_config(message.key, message.value);
          await patch_clean_workbench_with_purple_fluent_ui(this._config);
          await prompt_full_restart(
            "Theme Editor Pro settings updated! Restart to see changes. For some changed to fully apply vscode needs to be fully closed and reopened",
          );
          break;
        case "openCssFile":
          this._openFile(this._config.paths.css_file);
          break;
        case "openJsFile":
          this._openFile(this._config.paths.js_file);
          break;
        case "resetCssFile":
          this._resetFile(this._config.paths.css_file);
          break;
        case "resetJsFile":
          this._resetFile(this._config.paths.js_file);
          break;
        case "openThemeFile":
          this._openFile(this._config.paths.current_theme_json);
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

  // Helper function to convert color to rgba format with alpha
  private _convertToRgba(color: string, alpha: number = 1): string {
    if (color === "transparent") {
      return "transparent";
    }

    // If it's already rgba, return as is
    if (color.startsWith("rgba")) {
      return color;
    }

    // Convert hex to rgba
    if (color.startsWith("#")) {
      const hex = color.slice(1);
      const r = parseInt(hex.substr(0, 2), 16);
      const g = parseInt(hex.substr(2, 2), 16);
      const b = parseInt(hex.substr(4, 2), 16);
      return `rgba(${r}, ${g}, ${b}, ${alpha})`;
    }

    return color;
  }

  // Helper function to extract hex color from rgba
  private _extractHexFromRgba(color: string): string {
    if (color === "transparent" || !color) {
      return "#000000";
    }

    if (color.startsWith("#")) {
      return color;
    }

    if (color.startsWith("rgba")) {
      const match = color.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/);
      if (match) {
        const r = parseInt(match[1]);
        const g = parseInt(match[2]);
        const b = parseInt(match[3]);
        return `#${((1 << 24) + (r << 16) + (g << 8) + b)
          .toString(16)
          .slice(1)}`;
      }
    }

    return color;
  }

  // Helper function to extract alpha from rgba
  private _extractAlphaFromRgba(color: string): number {
    if (color === "transparent") {
      return 0;
    }
    if (!color || color.startsWith("#")) {
      return 1;
    }

    if (color.startsWith("rgba")) {
      const match = color.match(/rgba?\([^,]+,[^,]+,[^,]+,\s*([^)]+)\)/);
      if (match) {
        return parseFloat(match[1]);
      }
    }

    return 1;
  }

  private _getHtmlForWebview(webview: vscode.Webview): string {
    const cssExists = fs.existsSync(this._config.paths.css_file);
    const jsExists = fs.existsSync(this._config.paths.js_file);

    // Get current theme editor settings
    const compactMode = this._get_user_vars_config(
      "theme-editor-pro.compact",
      IS_COMPACT,
    );
    const accentColor = this._get_user_vars_config(
      "theme-editor-pro.accent",
      THEME_ACCENT,
    );
    const darkColor = this._get_user_vars_config(
      "theme-editor-pro.dark-color",
      THEME_DARK_BACKGROUND,
    );
    const lightColor = this._get_user_vars_config(
      "theme-editor-pro.light-color",
      THEME_LIGHT_BACKGROUND,
    );
    const backgroundColor = this._get_user_vars_config(
      "theme-editor-pro.background",
      THEME_BACKGROUND,
    );

    // Extract hex values and alpha values for the UI
    const accentHex = this._extractHexFromRgba(accentColor);
    const accentAlpha = this._extractAlphaFromRgba(accentColor);
    const darkHex = this._extractHexFromRgba(darkColor);
    const darkAlpha = this._extractAlphaFromRgba(darkColor);
    const lightHex = this._extractHexFromRgba(lightColor);
    const lightAlpha = this._extractAlphaFromRgba(lightColor);
    const backgroundHex = this._extractHexFromRgba(backgroundColor);
    const backgroundAlpha = this._extractAlphaFromRgba(backgroundColor);

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
        .color-row {
          display: flex;
          align-items: center;
          gap: 8px;
          margin: 8px 0;
        }
        .color-label {
          flex: 1;
          font-size: 13px;
        }
        .color-controls {
          display: flex;
          flex-direction: column;
          gap: 4px;
        }
        .color-input-row {
          display: flex;
          align-items: center;
          gap: 8px;
        }
        .color-input {
          width: 50px;
          height: 30px;
          border: 1px solid var(--vscode-foreground);
          border-radius: 4px;
          cursor: pointer;
          background: none;
        }
        .color-input::-webkit-color-swatch-wrapper {
          padding: 0;
        }
        .color-input::-webkit-color-swatch {
          border: none;
          border-radius: 3px;
        }
        .alpha-slider {
          width: 60px;
          height: 20px;
          margin: 0;
          cursor: pointer;
        }
        .alpha-value {
          font-size: 11px;
          color: var(--vscode-descriptionForeground);
          min-width: 25px;
          text-align: center;
        }
        .transparent-option {
          display: flex;
          align-items: center;
          gap: 4px;
          margin-left: 8px;
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
        fieldset:disabled {
        pointer-events: none;
        opacity: 0.5;
        cursor: default;
      }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="section">
          <div class="checkbox-container">
            <input type="checkbox" id="toggleThemeEnabled" ${
              this._isPurpleThemeEnabled ? "checked" : ""
            } />
            <label for="toggleThemeEnabled">${
              this._isPurpleThemeEnabled ? "Disable" : "Enable"
            } Custom Theme</label>
          </div>
          <div class="section" ${this._isPurpleThemeEnabled ? "disabled" : ""}>
            <fieldset ${!this._isPurpleThemeEnabled ? "disabled" : ""}>
              <div class="section-title">Theme Editor Pro Settings</div>

              <div class="note-important">
                  🎯 Some Settings apply partially with only a window reload, but some required a full vscode close and reopen, you get to choose in the popup.
              </div>

              <div class="checkbox-container">
                <input type="checkbox" id="compactMode" ${
                  compactMode ? "checked" : ""
                } />
                <label for="compactMode">Compact Mode</label>
              </div>
              
              <div class="color-row">
                <label class="color-label">Accent Color:</label>
                <div class="color-controls">
                  <div class="color-input-row">
                    <input type="color" class="color-input" id="accentColor" value="${accentHex}" />
                    <input type="range" class="alpha-slider" id="accentAlpha" min="0" max="1" step="0.01" value="${accentAlpha}" />
                    <span class="alpha-value" id="accentAlphaValue">${Math.round(
                      accentAlpha * 100,
                    )}%</span>
                  </div>
                </div>
              </div>
              
              <div class="color-row">
                <label class="color-label">Editor & Sections:</label>
                <div class="color-controls">
                  <div class="color-input-row">
                    <input type="color" class="color-input" id="darkColor" value="${darkHex}" />
                    <input type="range" class="alpha-slider" id="darkAlpha" min="0" max="1" step="0.01" value="${darkAlpha}" />
                    <span class="alpha-value" id="darkAlphaValue">${Math.round(
                      darkAlpha * 100,
                    )}%</span>
                  </div>
                </div>
              </div>

              <div class="color-row">
                <label class="color-label">Background:</label>
                <div class="color-controls">
                  <div class="color-input-row">
                    <input type="color" class="color-input" id="backgroundColor" value="${backgroundHex}" />
                    <input type="range" class="alpha-slider" id="backgroundAlpha" min="0" max="1" step="0.01" value="${backgroundAlpha}" />
                    <span class="alpha-value" id="backgroundAlphaValue">${Math.round(
                      backgroundAlpha * 100,
                    )}%</span>
                  </div>
                </div>
              </div>

              <div class="button-row">
                <button class="button" id="resetThemeEditorSettingBtn">
                  Reset Settings to default (Purple).
                </button>
              </div>
            </fieldset>
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

        <div class="section" >
          <div class="checkbox-container">
            <input ${this._isPurpleThemeEnabled ? "disabled" : ""}
             type="checkbox" id="toggleInjectionEnabled" ${
               this._isCssJsInjectionEnabled ? "checked" : ""
             } />
            <label for="toggleInjectionEnabled">${
              this._isCssJsInjectionEnabled ? "Disable" : "Enable"
            } CSS/JS Injection</label>
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

          // Helper function to convert hex and alpha to rgba
          function hexToRgba(hex, alpha) {
            const r = parseInt(hex.slice(1, 3), 16);
            const g = parseInt(hex.slice(3, 5), 16);
            const b = parseInt(hex.slice(5, 7), 16);
            return \`rgba(\${r}, \${g}, \${b}, \${alpha})\`;
          }

          // Helper function to send theme editor setting update
          function updateThemeEditorSetting(key, value) {
            vscode.postMessage({
              command: 'updateThemeEditorSetting',
              key: key,
              value: value
            });
          }

          // Helper function to update color with alpha
          function updateColorSetting(colorId, alphaId, settingKey) {
            const colorElement = document.getElementById(colorId);
            const alphaElement = document.getElementById(alphaId);
            
            const color = colorElement.value;
            const alpha = parseFloat(alphaElement.value);
            const rgba = hexToRgba(color, alpha);
            
            updateThemeEditorSetting(settingKey, rgba);
          }

          // Debounce function to delay execution
          function debounce(func, wait) {
            let timeout;
            return function executedFunction(...args) {
              const later = () => {
                clearTimeout(timeout);
                func(...args);
              };
              clearTimeout(timeout);
              timeout = setTimeout(later, wait);
            };
          }

          // Create debounced versions of the update functions
          const debouncedAccentUpdate = debounce(() => {
            updateColorSetting('accentColor', 'accentAlpha', 'theme-editor-pro.accent');
          }, 500);

          const debouncedDarkUpdate = debounce(() => {
            updateColorSetting('darkColor', 'darkAlpha', 'theme-editor-pro.dark-color');
          }, 500);

          const debouncedLightUpdate = debounce(() => {
            updateColorSetting('lightColor', 'lightAlpha', 'theme-editor-pro.light-color');
          }, 500);

          const debouncedBackgroundUpdate = debounce(() => {
            updateColorSetting('backgroundColor', 'backgroundAlpha', 'theme-editor-pro.background');
          }, 500);

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

          // Theme Editor Pro Settings Event Listeners
          document.getElementById('compactMode').addEventListener('change', (e) => {
            updateThemeEditorSetting('theme-editor-pro.compact', e.target.checked);
          });

          // Accent Color Event Listeners
          document.getElementById('accentColor').addEventListener('change', (e) => {
            updateColorSetting('accentColor', 'accentAlpha', 'theme-editor-pro.accent');
          });
          document.getElementById('accentAlpha').addEventListener('input', (e) => {
            document.getElementById('accentAlphaValue').textContent = Math.round(e.target.value * 100) + '%';
            debouncedAccentUpdate();
          });

          // Dark Color Event Listeners
          document.getElementById('darkColor').addEventListener('change', (e) => {
            updateColorSetting('darkColor', 'darkAlpha', 'theme-editor-pro.dark-color');
          });
          document.getElementById('darkAlpha').addEventListener('input', (e) => {
            document.getElementById('darkAlphaValue').textContent = Math.round(e.target.value * 100) + '%';
            debouncedDarkUpdate();
          });

           // Background Color Event Listeners
          document.getElementById('backgroundColor').addEventListener('change', (e) => {
            updateColorSetting('backgroundColor', 'backgroundAlpha', 'theme-editor-pro.background');
          });
          document.getElementById('backgroundAlpha').addEventListener('input', (e) => {
            document.getElementById('backgroundAlphaValue').textContent = Math.round(e.target.value * 100) + '%';
            debouncedBackgroundUpdate();
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


           document.getElementById('resetThemeEditorSettingBtn').addEventListener('click', () => {
            vscode.postMessage({
              command: 'resetThemeEditorSetting'
            });
          });
        })();
      </script>
    </body>
    </html>`;
  }
}

// <div class="color-row">
//   <label class="color-label">Light Color:</label>
//   <div class="color-controls">
//     <div class="color-input-row">
//       <input
//         type="color"
//         class="color-input"
//         id="lightColor"
//         value="${lightHex}"
//       />
//       <input
//         type="range"
//         class="alpha-slider"
//         id="lightAlpha"
//         min="0"
//         max="1"
//         step="0.01"
//         value="${lightAlpha}"
//       />
//       <span class="alpha-value" id="lightAlphaValue">
//         ${Math.round(lightAlpha * 100)}%
//       </span>
//     </div>
//   </div>
// </div>;
//  // Light Color Event Listeners
//  document.getElementById('lightColor').addEventListener('change', (e) => {
//   updateColorSetting('lightColor', 'lightAlpha', 'theme-editor-pro.light-color');
// });
// document.getElementById('lightAlpha').addEventListener('input', (e) => {
//   document.getElementById('lightAlphaValue').textContent = Math.round(e.target.value * 100) + '%';
//   debouncedLightUpdate();
// });
