import path from "path";
import * as os from "os";
import * as Url from "url";
import * as fs from "fs";

export function parse_path_to_valid_url(path: string) {
  if (/^file:/.test(path)) {
    return path.replaceAll(
      /\$\{([^\{\}]+)\}/g,
      (substr, key) => resolveKey(key) ?? substr,
    );
  } else {
    return path;
  }
}

function resolveKey(key: string) {
  const variables: Record<string, () => string> = {
    cwd: () => process.cwd(),
    userHome: () => os.homedir(),
    execPath: () => process.env.VSCODE_EXEC_PATH ?? process.execPath,
    pathSeparator: () => path.sep,
    "/": () => path.sep,
  };

  if (key in variables) {
    return variables[key]();
  }

  if (key.startsWith("env:")) {
    const [_, envKey, optionalDefault] = key.split(":");
    return process.env[envKey as string] ?? optionalDefault ?? "";
  }

  return undefined;
}

export async function get_file_content(url: Url.URL | string) {
  try {
    let filePath: string;
    if (typeof url === "string") {
      if (url.startsWith("file://")) {
        filePath = Url.fileURLToPath(url);
      } else {
        filePath = url;
      }
    } else {
      filePath = Url.fileURLToPath(url);
    }
    return await fs.promises.readFile(filePath);
  } catch (error) {
    console.error(`Failed to load content from ${url}:`, error);
    throw error;
  }
}
