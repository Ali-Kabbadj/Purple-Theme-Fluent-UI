import { getImageUri } from "./functions";

export const iconsAndSvgs = `
.file-icons-enabled
  .show-file-icons
  .vscode_getting_started_page-name-file-icon.file-icon:before,
.file-icons-enabled
  .show-file-icons
  .webview-vs_code_release_notes-name-file-icon.file-icon:before {
  background-image: url("${getImageUri("icon.svg")}");
  content: "";
}

.monaco-workbench{
  background-color: THEME_BACKGROUND !important;
}

.monaco-workbench
  .part.titlebar
  > .titlebar-container
  > .titlebar-left
  > .window-appicon:not(.codicon) {
  background-image: url("${getImageUri("icon.svg")}");
  background-position: 50%;
  background-repeat: no-repeat;
  background-size: 20px;
}

.monaco-workbench.vs-dark
  .part.editor
  >.content
  .editor-group-container
  .editor-group-watermark
  >.letterpress {
  background-image: url("${getImageUri("icon.svg")}");
}

.editor-group-container.active.empty {
    background-color: THEME_DARK_BACKGROUND !important;
}


.monaco-workbench .xterm .xterm-scrollable-element {
  background-color: THEME_DARK_BACKGROUND !important;
}

.xterm-dom-renderer-owner-1 .xterm-fg-257 {
  color: THEME_DARK_BACKGROUND !important;
}

.monaco-workbench
  .pane-composite-part
  > .header-or-footer
  > .composite-bar-container
  > .composite-bar
  > .monaco-action-bar
  .action-item,
.monaco-workbench
  .pane-composite-part
  > .title
  > .composite-bar-container
  > .composite-bar
  > .monaco-action-bar
  .action-item {
  border-top-left-radius: var(--border-radius) !important;
  border-top-right-radius: var(--border-radius) !important;
}

.activitybar
> .content :not(.monaco-menu)
 > .monaco-action-bar
  .action-item {
  border-radius: 8px !important;
}

li.action-item.start-debug-action-item {
  background-color: THEME_ACCENT !important;
}

:root {
  --vscode-focusBorder: THEME_ACCENT !important;
}
`;
