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
  // Try multiple approaches to ensure the message gets through

  // Approach 1: Use status bar message (always visible)
  const statusBarItem = vscode.window.createStatusBarItem(
    vscode.StatusBarAlignment.Right,
    1000,
  );
  statusBarItem.text = "$(warning) Theme Updated - Restart Required";
  statusBarItem.tooltip = message;
  statusBarItem.command = "workbench.action.reloadWindow";
  statusBarItem.show();

  //  the information message with a longer delay
  setTimeout(async () => {
    try {
      const choice = await vscode.window.showInformationMessage(
        message,
        { modal: true }, // Make it modal so it's more likely to appear
        "Reload Window",
        "Close Now",
        "Later",
      );

      if (choice === "Reload Window") {
        await vscode.commands.executeCommand("workbench.action.reloadWindow");
      } else if (choice === "Close Now") {
        await vscode.commands.executeCommand("workbench.action.quit");
      }

      // Hide the status bar item if user responded
      statusBarItem.hide();
      statusBarItem.dispose();
    } catch (error) {
      console.error("Information message failed:", error);
      // Keep status bar item as fallback
    }
  }, 650);

  // Approach 3: Use output channel as backup notification
  const outputChannel = vscode.window.createOutputChannel("Theme Editor Pro");
  outputChannel.appendLine(`[${new Date().toLocaleTimeString()}] ${message}`);
  outputChannel.show(true);

  // Auto-hide status bar after 30 seconds if user doesn't interact
  setTimeout(() => {
    statusBarItem.hide();
    statusBarItem.dispose();
  }, 30000);
}
