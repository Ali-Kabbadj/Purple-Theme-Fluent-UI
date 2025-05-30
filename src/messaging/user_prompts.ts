import * as vscode from "vscode";
import { spawn } from "child_process";
import { writeFileSync, unlinkSync } from "fs";
import { tmpdir } from "os";
import { join } from "path";

export async function prompt_restart(message: string) {
  const choice = await vscode.window.showInformationMessage(
    message,
    "Restart Now",
  );
  if (choice === "Restart Now") {
    await vscode.commands.executeCommand("workbench.action.reloadWindow");
  }
}

export async function prompt_full_restart(message: string) {
  const choice = await vscode.window.showInformationMessage(
    message,
    "Reload Windows",
    "Close Now",
  );

  if (choice === "Reload Windows") {
    // Reloads the VS Code window
    await vscode.commands.executeCommand("workbench.action.reloadWindow");
  } else if (choice === "Close Now") {
    // Closes all VS Code windows
    await vscode.commands.executeCommand("workbench.action.quit");
  }
}
