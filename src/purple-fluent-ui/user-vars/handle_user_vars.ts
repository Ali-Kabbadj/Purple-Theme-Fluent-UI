import * as fs from "fs";
import { Config } from "../../config/config";
import {
  IS_COMPACT,
  THEME_ACCENT,
  THEME_DARK_BACKGROUND,
  THEME_LIGHT_BACKGROUND,
  THEME_BACKGROUND,
} from "../../utils/constants";

export interface UserThemeVars {
  compact?: boolean;
  accent?: string;
  "dark-color"?: string;
  "light-color"?: string;
  background?: string;
}

/**
 * Read user theme variables from JSON file
 * @param config - Configuration object containing file paths
 * @returns Promise<UserThemeVars> - User theme variables object
 */
export async function readUserThemeVars(
  config: Config,
): Promise<UserThemeVars> {
  try {
    const content = await fs.promises.readFile(
      config.paths.user_theme_vars_json_file,
      "utf-8",
    );
    return JSON.parse(content);
  } catch (error) {
    // If file doesn't exist or is invalid, return empty object
    return {};
  }
}

/**
 * Read user theme variables from JSON file synchronously
 * @param config - Configuration object containing file paths
 * @returns UserThemeVars - User theme variables object
 */
export function readUserThemeVarsSync(config: Config): UserThemeVars {
  try {
    const content = fs.readFileSync(
      config.paths.user_theme_vars_json_file,
      "utf-8",
    );
    return JSON.parse(content);
  } catch (error) {
    // If file doesn't exist or is invalid, return empty object
    return {};
  }
}

/**
 * Write user theme variables to JSON file
 * @param config - Configuration object containing file paths
 * @param vars - User theme variables to write
 */
export async function writeUserThemeVars(
  config: Config,
  vars: UserThemeVars,
): Promise<void> {
  try {
    await fs.promises.writeFile(
      config.paths.user_theme_vars_json_file,
      JSON.stringify(vars, null, 2),
    );
  } catch (error) {
    throw new Error(`Failed to write user theme vars: ${error}`);
  }
}

/**
 * Write user theme variables to JSON file synchronously
 * @param config - Configuration object containing file paths
 * @param vars - User theme variables to write
 */
export function writeUserThemeVarsSync(
  config: Config,
  vars: UserThemeVars,
): void {
  try {
    fs.writeFileSync(
      config.paths.user_theme_vars_json_file,
      JSON.stringify(vars, null, 2),
    );
  } catch (error) {
    throw new Error(`Failed to write user theme vars: ${error}`);
  }
}

/**
 * Get a specific user theme variable with fallback to default
 * @param config - Configuration object containing file paths
 * @param key - The key to retrieve (e.g., 'compact', 'accent')
 * @param defaultValue - Default value if key doesn't exist
 * @returns The value or default
 */
export function getUserThemeVar(
  config: Config,
  key: keyof UserThemeVars,
  defaultValue: any,
): any {
  const userVars = readUserThemeVarsSync(config);
  return userVars[key] ?? defaultValue;
}

/**
 * Get a specific user theme variable with fallback to default (async)
 * @param config - Configuration object containing file paths
 * @param key - The key to retrieve (e.g., 'compact', 'accent')
 * @param defaultValue - Default value if key doesn't exist
 * @returns Promise<any> The value or default
 */
export async function getUserThemeVarAsync(
  config: Config,
  key: keyof UserThemeVars,
  defaultValue: any,
): Promise<any> {
  const userVars = await readUserThemeVars(config);
  return userVars[key] ?? defaultValue;
}

/**
 * Update a specific user theme variable
 * @param config - Configuration object containing file paths
 * @param key - The key to update
 * @param value - The new value
 */
export async function updateUserThemeVar(
  config: Config,
  key: keyof UserThemeVars,
  value: any,
): Promise<void> {
  const userVars = await readUserThemeVars(config);
  userVars[key] = value;
  await writeUserThemeVars(config, userVars);
}

/**
 * Get user theme variables with defaults applied
 * @param config - Configuration object containing file paths
 * @returns UserThemeVars with defaults for missing values
 */
export function getUserThemeVarsWithDefaults(config: Config): UserThemeVars {
  const userVars = readUserThemeVarsSync(config);
  return {
    compact: userVars.compact ?? IS_COMPACT,
    accent: userVars.accent ?? THEME_ACCENT,
    "dark-color": userVars["dark-color"] ?? THEME_DARK_BACKGROUND,
    "light-color": userVars["light-color"] ?? THEME_LIGHT_BACKGROUND,
    background: userVars.background ?? THEME_BACKGROUND,
  };
}

/**
 * Get user theme variables with defaults applied (async)
 * @param config - Configuration object containing file paths
 * @returns Promise<UserThemeVars> with defaults for missing values
 */
export async function getUserThemeVarsWithDefaultsAsync(
  config: Config,
): Promise<UserThemeVars> {
  const userVars = await readUserThemeVars(config);
  return {
    compact: userVars.compact ?? IS_COMPACT,
    accent: userVars.accent ?? THEME_ACCENT,
    "dark-color": userVars["dark-color"] ?? THEME_DARK_BACKGROUND,
    "light-color": userVars["light-color"] ?? THEME_LIGHT_BACKGROUND,
    background: userVars.background ?? THEME_BACKGROUND,
  };
}
