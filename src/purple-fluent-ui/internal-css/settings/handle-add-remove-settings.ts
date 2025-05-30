// ### Usage Examples: ###
// // Default theme mapping
// await set_custom_settings(config);

// // Set specific property with color
// await set_custom_settings(config, "titleBar.activeBackground", "#ff0000");

// // Set title bar to use accent color from theme vars
// await set_specific_property(
//   config,
//   "titleBar.activeBackground",
//   "accent",
//   THEME_ACCENT,
// );

// // Set status bar to red directly
// await set_property_with_color("statusBar.background", "#ff0000");

// // Remove specific property
// await remove_custom_settings(config, "titleBar.activeBackground");

// // Remove all managed properties
// await remove_custom_settings(config);

import { Config } from "../../../config/config";
import { THEME_BACKGROUND } from "../../../utils/constants";

import * as fs from "fs";
import * as path from "path";
import * as os from "os";
import { getUserThemeVarAsync } from "../../user-vars/handle_user_vars";

// Theme configuration for VSCode settings
import { UserThemeVars } from "../../user-vars/handle_user_vars";

interface VSCodeThemeConfig {
  [vscodeProperty: string]: {
    userVarKey: keyof UserThemeVars;
    defaultValue: string;
  };
}

// Define which VSCode properties map to which user theme variables
const VSCODE_THEME_MAPPING: VSCodeThemeConfig = {
  "titleBar.activeBackground": {
    userVarKey: "background",
    defaultValue: THEME_BACKGROUND,
  },
  "titleBar.inactiveBackground": {
    userVarKey: "background",
    defaultValue: THEME_BACKGROUND,
  },
  // Add more mappings here as needed
  // "statusBar.background": {
  //     userVarKey: "accent",
  //     defaultValue: THEME_ACCENT
  // },
  // "activityBar.background": {
  //     userVarKey: "dark-color",
  //     defaultValue: THEME_DARK_BACKGROUND
  // }
};

/**
 * Get VSCode global settings.json path based on the operating system
 */
function getVSCodeSettingsPath(): string {
  const homeDir = os.homedir();

  switch (os.platform()) {
    case "win32":
      return path.join(
        homeDir,
        "AppData",
        "Roaming",
        "Code",
        "User",
        "settings.json",
      );
    case "darwin":
      return path.join(
        homeDir,
        "Library",
        "Application Support",
        "Code",
        "User",
        "settings.json",
      );
    case "linux":
    default:
      return path.join(homeDir, ".config", "Code", "User", "settings.json");
  }
}

/**
 * Update a specific property in the JSON file without affecting formatting or comments
 */
function updatePropertyInContent(
  content: string,
  propertyName: string,
  newValue: string,
): { updated: boolean; content: string } {
  const lines = content.split("\n");
  let updated = false;

  // Escape special regex characters in property name
  const escapedPropertyName = propertyName.replace(
    /[.*+?^${}()|[\]\\]/g,
    "\\$&",
  );

  // Create regex to match the property line
  // Matches: optional whitespace, quote, property name, quote, optional whitespace, colon, optional whitespace, value, optional comma
  const propertyRegex = new RegExp(
    `^(\\s*"${escapedPropertyName}"\\s*:\\s*)[^,\\n]+(,?)\\s*$`,
  );

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const match = line.match(propertyRegex);

    if (match) {
      // Replace the value while preserving indentation and comma
      const [fullMatch, beforeValue, comma] = match;
      lines[i] = `${beforeValue}${JSON.stringify(newValue)}${comma}`;
      updated = true;
      break;
    }
  }

  return {
    updated,
    content: lines.join("\n"),
  };
}

/**
 * Add a new property to the JSON file while preserving formatting
 */
function addPropertyToContent(
  content: string,
  propertyName: string,
  value: string,
): string {
  const lines = content.split("\n");
  let insertIndex = -1;
  let indentation = "    "; // Default indentation

  // Find the best place to insert the new property
  // Look for the last property before the closing brace
  for (let i = lines.length - 1; i >= 0; i--) {
    const line = lines[i];
    const trimmed = line.trim();

    // Found closing brace
    if (trimmed === "}") {
      insertIndex = i;
      break;
    }

    // Found a property line to match indentation
    if (
      trimmed.includes(":") &&
      !trimmed.startsWith("//") &&
      !trimmed.startsWith("/*")
    ) {
      const match = line.match(/^(\s*)/);
      if (match) {
        indentation = match[1];
      }
    }
  }

  if (insertIndex === -1) {
    // No closing brace found, file might be empty or malformed
    // Create a simple JSON structure
    return `{\n    "${propertyName}": ${JSON.stringify(value)}\n}`;
  }

  // Check if we need to add a comma to the previous property
  let needsComma = false;
  for (let i = insertIndex - 1; i >= 0; i--) {
    const line = lines[i].trim();
    if (line && !line.startsWith("//") && !line.startsWith("/*")) {
      // Found the last non-comment line before closing brace
      if (!line.endsWith(",") && line !== "{") {
        lines[i] = lines[i] + ",";
      }
      break;
    }
  }

  // Insert the new property
  const newPropertyLine = `${indentation}"${propertyName}": ${JSON.stringify(
    value,
  )}`;
  lines.splice(insertIndex, 0, newPropertyLine);

  return lines.join("\n");
}

/**
 * Remove a specific property from the JSON content
 */
function removePropertyFromContent(
  content: string,
  propertyName: string,
): { updated: boolean; content: string } {
  const lines = content.split("\n");
  let updated = false;
  let removedLineIndex = -1;

  // Escape special regex characters in property name
  const escapedPropertyName = propertyName.replace(
    /[.*+?^${}()|[\]\\]/g,
    "\\$&",
  );

  // Create regex to match the property line
  const propertyRegex = new RegExp(
    `^\\s*"${escapedPropertyName}"\\s*:\\s*[^,\\n]+(,?)\\s*$`,
  );

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (propertyRegex.test(line)) {
      removedLineIndex = i;
      updated = true;
      break;
    }
  }

  if (updated) {
    // Remove the line
    lines.splice(removedLineIndex, 1);

    // Handle comma cleanup
    // If the removed line had a comma, we might need to remove a trailing comma from the previous property
    if (removedLineIndex < lines.length) {
      // Check if the next non-empty line is a closing brace
      for (let i = removedLineIndex; i < lines.length; i++) {
        const line = lines[i].trim();
        if (line) {
          if (line === "}") {
            // Next significant line is closing brace, remove trailing comma from previous property
            for (let j = removedLineIndex - 1; j >= 0; j--) {
              const prevLine = lines[j].trim();
              if (
                prevLine &&
                !prevLine.startsWith("//") &&
                !prevLine.startsWith("/*")
              ) {
                if (prevLine.endsWith(",")) {
                  lines[j] = lines[j].replace(/,\s*$/, "");
                }
                break;
              }
            }
          }
          break;
        }
      }
    }
  }

  return {
    updated,
    content: lines.join("\n"),
  };
}

/**
 * Set or update a specific property in VSCode settings
 */
async function setPropertyInFile(
  settingsPath: string,
  propertyName: string,
  value: string,
): Promise<void> {
  try {
    let content = "";
    let fileExists = false;

    // Check if file exists and read it
    if (fs.existsSync(settingsPath)) {
      content = await fs.promises.readFile(settingsPath, "utf-8");
      fileExists = true;
    }

    // If file doesn't exist or is empty, create basic structure
    if (!fileExists || !content.trim()) {
      content = "{\n}";
    }

    // Try to update existing property
    const updateResult = updatePropertyInContent(content, propertyName, value);

    if (updateResult.updated) {
      // Property was updated
      content = updateResult.content;
    } else {
      // Property doesn't exist, add it
      content = addPropertyToContent(content, propertyName, value);
    }

    // Ensure User directory exists
    const userDir = path.dirname(settingsPath);
    if (!fs.existsSync(userDir)) {
      await fs.promises.mkdir(userDir, { recursive: true });
    }

    // Write the updated content
    await fs.promises.writeFile(settingsPath, content, "utf-8");

    console.log(`VSCode property "${propertyName}" set to "${value}"`);
    console.log(`Settings file location: ${settingsPath}`);
  } catch (error) {
    throw new Error(`Failed to set VSCode property: ${error}`);
  }
}

/**
 * Remove a specific property from VSCode settings
 */
async function removePropertyFromFile(
  settingsPath: string,
  propertyName: string,
): Promise<boolean> {
  try {
    if (!fs.existsSync(settingsPath)) {
      console.log("VSCode settings file does not exist, nothing to remove");
      return false;
    }

    const content = await fs.promises.readFile(settingsPath, "utf-8");
    const removeResult = removePropertyFromContent(content, propertyName);

    if (removeResult.updated) {
      await fs.promises.writeFile(settingsPath, removeResult.content, "utf-8");
      console.log(`VSCode property "${propertyName}" removed`);
      return true;
    } else {
      console.log(`VSCode property "${propertyName}" not found in settings`);
      return false;
    }
  } catch (error) {
    throw new Error(`Failed to remove VSCode property: ${error}`);
  }
}

/**
 * Set custom settings - can use default mappings or set specific property with color
 * @param config - Configuration object
 * @param propertyName - Optional: specific VSCode property name
 * @param colorValue - Optional: direct color value for the property
 * @param themeMapping - Optional: custom theme mapping (defaults to VSCODE_THEME_MAPPING)
 */
export async function set_custom_settings(
  config: Config,
  propertyName?: string,
  colorValue?: string,
  themeMapping: VSCodeThemeConfig = VSCODE_THEME_MAPPING,
) {
  try {
    const vscodeSettingsPath = getVSCodeSettingsPath();

    if (propertyName && colorValue) {
      // Set specific property with direct color value
      await setPropertyInFile(vscodeSettingsPath, propertyName, colorValue);
    } else {
      // Apply theme mappings
      const appliedProperties: string[] = [];

      for (const [vscodeProperty, themeConfig] of Object.entries(
        themeMapping,
      )) {
        const value = await getUserThemeVarAsync(
          config,
          themeConfig.userVarKey,
          themeConfig.defaultValue,
        );
        await setPropertyInFile(vscodeSettingsPath, vscodeProperty, value);
        appliedProperties.push(vscodeProperty);
      }

      console.log(
        `VSCode global settings updated with theme mappings:`,
        appliedProperties,
      );
    }
  } catch (error) {
    throw new Error(`Failed to set custom VSCode settings: ${error}`);
  }
}

/**
 * Remove custom settings - can remove specific property or all managed properties
 * @param config - Configuration object
 * @param propertyName - Optional: specific property to remove. If not provided, removes all managed properties
 * @param themeMapping - Optional: custom theme mapping (defaults to VSCODE_THEME_MAPPING)
 */
export async function remove_custom_settings(
  config: Config,
  propertyName?: string,
  themeMapping: VSCodeThemeConfig = VSCODE_THEME_MAPPING,
) {
  try {
    const vscodeSettingsPath = getVSCodeSettingsPath();

    if (propertyName) {
      // Remove specific property
      await removePropertyFromFile(vscodeSettingsPath, propertyName);
    } else {
      // Remove all properties defined in the theme mapping
      const removedProperties: string[] = [];

      for (const vscodeProperty of Object.keys(themeMapping)) {
        const removed = await removePropertyFromFile(
          vscodeSettingsPath,
          vscodeProperty,
        );
        if (removed) {
          removedProperties.push(vscodeProperty);
        }
      }

      if (removedProperties.length > 0) {
        console.log("Custom VSCode settings removed:", removedProperties);
      } else {
        console.log("No managed VSCode properties found to remove");
      }
    }
  } catch (error) {
    throw new Error(`Failed to remove custom VSCode settings: ${error}`);
  }
}

/**
 * Set a specific VSCode property with a specific user theme variable
 */
export async function set_specific_property(
  config: Config,
  vscodeProperty: string,
  userVarKey: keyof UserThemeVars,
  defaultValue: string,
) {
  const value = await getUserThemeVarAsync(config, userVarKey, defaultValue);
  const vscodeSettingsPath = getVSCodeSettingsPath();
  await setPropertyInFile(vscodeSettingsPath, vscodeProperty, value);
}

/**
 * Set a specific VSCode property with a direct color value
 */
export async function set_property_with_color(
  vscodeProperty: string,
  colorValue: string,
) {
  const vscodeSettingsPath = getVSCodeSettingsPath();
  await setPropertyInFile(vscodeSettingsPath, vscodeProperty, colorValue);
}

/**
 * Remove a specific VSCode property
 */
export async function remove_specific_property(vscodeProperty: string) {
  const vscodeSettingsPath = getVSCodeSettingsPath();
  await removePropertyFromFile(vscodeSettingsPath, vscodeProperty);
}

// Helper function to create custom theme mapping
export function createCustomThemeMapping(mappings: {
  [vscodeProperty: string]: {
    userVarKey: keyof UserThemeVars;
    defaultValue: string;
  };
}): VSCodeThemeConfig {
  return mappings;
}

// Example usage for different theme configurations:
export const TITLE_BAR_THEME = createCustomThemeMapping({
  "titleBar.activeBackground": {
    userVarKey: "background",
    defaultValue: THEME_BACKGROUND,
  },
  "titleBar.inactiveBackground": {
    userVarKey: "background",
    defaultValue: THEME_BACKGROUND,
  },
});

export const ACCENT_THEME = createCustomThemeMapping({
  "titleBar.activeBackground": {
    userVarKey: "accent",
    defaultValue: THEME_BACKGROUND,
  },
  "titleBar.inactiveBackground": {
    userVarKey: "accent",
    defaultValue: THEME_BACKGROUND,
  },
});
