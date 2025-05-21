import * as vscode from "vscode";

export interface MessageHandler {
  promptRestartAsAdmin: () => Promise<void>;
  promptRestartIde: () => Promise<void>;
  showEnabled: () => Promise<void>;
  showDisabled: () => Promise<void>;
  showAlreadyDisabled: () => Promise<void>;
  showError: (error: string) => Promise<void>;
  promptNotFound: () => Promise<void>;
  promptReloadAfterUpgrade: () => Promise<void>;
  promptLocatePathFailure: () => void;
  promptLocatePathBackupFailure: () => void;
  cannotLoad: (url: string) => void;
}

export const messageHandler: MessageHandler = {
  async promptRestartAsAdmin() {
    const choice = await vscode.window.showInformationMessage(
      "This action requires administrative privileges. Please restart VS Code as an administrator.",
      "Open Instructions",
    );
    if (choice === "Open Instructions") {
      vscode.window.showInformationMessage(
        'To run VS Code as administrator:\n 1. Close all VS Code instances.\n 2. Right-click the VS Code icon.\n 3. Select "Run as administrator".',
      );
    }
  },

  async promptRestartIde() {
    const choice = await vscode.window.showInformationMessage(
      "A restart of Visual Studio Code is required to apply changes.",
      "Restart Now",
    );
    if (choice === "Restart Now") {
      await vscode.commands.executeCommand("workbench.action.reloadWindow");
    }
  },

  async showEnabled() {
    const choice = await vscode.window.showInformationMessage(
      "Custom CSS and JS enabled. Restart to take effect. If Code complains about corruption, click 'Don't Show Again'. See README for details.",
      "Restart Now",
    );
    if (choice === "Restart Now") {
      await vscode.commands.executeCommand("workbench.action.reloadWindow");
    }
  },

  async showDisabled() {
    const choice = await vscode.window.showInformationMessage(
      "Custom CSS and JS disabled and reverted to default. Restart to take effect.",
      "Restart Now",
    );
    if (choice === "Restart Now") {
      await vscode.commands.executeCommand("workbench.action.reloadWindow");
    }
  },

  async showAlreadyDisabled() {
    await vscode.window.showInformationMessage(
      "Custom CSS and JS are already disabled.",
    );
  },

  async showError(error: string) {
    await vscode.window.showErrorMessage(`Something went wrong: ${error}`);
  },

  async promptNotFound() {
    const choice = await vscode.window.showWarningMessage(
      "Custom CSS and JS extension not found.",
      "Open Marketplace",
    );
    if (choice === "Open Marketplace") {
      await vscode.commands.executeCommand(
        "extension.open",
        "be5invis.vscode-custom-css",
      );
    }
  },

  async promptReloadAfterUpgrade() {
    const choice = await vscode.window.showInformationMessage(
      "Detected CSS/JS reloading after VSCode upgrade. Restart to finalize.",
      "Restart Now",
    );
    if (choice === "Restart Now") {
      await vscode.commands.executeCommand("workbench.action.reloadWindow");
    }
  },

  async promptLocatePathFailure() {
    const choice = await vscode.window.showErrorMessage(
      "Unable to locate the installation path of VSCode. This extension may not function correctly.",
      "Reinstall Extension",
    );
    if (choice === "Reinstall Extension") {
      await vscode.commands.executeCommand(
        "workbench.extensions.installExtension",
        "be5invis.vscode-custom-css",
      );
    }
  },

  async promptLocatePathBackupFailure() {
    await vscode.window.showErrorMessage(
      "Unable to locate the backup files vscode might be currput, you might need to reinstall it",
    );
  },

  cannotLoad(url: string) {
    vscode.window.showErrorMessage(`Cannot load '${url}'. Skipping.`);
  },
};
