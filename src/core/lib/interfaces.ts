export interface GlobalThis {
  _VSCODE_FILE_ROOT?: string;
}

export interface ProductJson {
  checksums: Record<string, string>;
  [key: string]: any;
}

export interface Helper {
  uninstallCssJsInjector: () => Promise<void>;
  BackupFilePath: (uuid: string) => string;
  getBackupUuid: () => Promise<string | null>;
  createBackup: (uuidSession: string) => Promise<void>;
  restoreBackup: (backupFilePath: string) => Promise<void>;
  deleteBackupFiles: () => Promise<void>;
  performPatch: (uuidSession: string) => Promise<void>;
  enabledRestart: () => void;
  disabledRestart: () => void;
  clearExistingPatches: (html: string) => string;
  patchHtml: () => Promise<string>;
  patchHtmlForItem: (url: string) => Promise<string>;
  parsedUrl: (url: string) => string;
  isCssJsInjectorInstalled: () => Promise<boolean>;
  resolveVariable: (key: string) => string | undefined;
  getContent: (url: string | URL) => Promise<Buffer>;
  UpdateConfigWithCssJSFiles: () => void;
}

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
  ChecksumsChanged: (verb: string) => void;
  ChecksumsUnchanged: () => void;
  ChecksumsError: () => void;
}
