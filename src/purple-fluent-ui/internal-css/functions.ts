import * as vscode from "vscode";

export const getImageUri = (imageName: string) => {
  const extensionUri = vscode.extensions.getExtension(
    "Ali-Kabbadj.theme-editor-pro",
  )?.extensionUri;
  if (!extensionUri) {
    return;
  }

  // Use vscode.Uri.joinPath to properly construct the URI
  const imageUri = vscode.Uri.joinPath(
    extensionUri,
    "resources",
    "images",
    imageName,
  );

  // Convert to vscode-file URI scheme for use in CSS
  return imageUri.with({ scheme: "vscode-file" }).toString();
};
