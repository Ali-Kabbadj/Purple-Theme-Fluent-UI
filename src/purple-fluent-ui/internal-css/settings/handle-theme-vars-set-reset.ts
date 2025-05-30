// ### Usage Examples: ###
// // Set specific theme property with color
// await set_theme_property(config, "titleBar.activeBackground", "#ff0000");

// // Set theme property using user theme variable
// await set_theme_property_with_var(config, "titleBar.activeBackground", "accent", THEME_ACCENT);

// // Apply multiple theme mappings
// await apply_theme_mappings(config, TITLE_BAR_THEME_MAPPING);

// // Reset specific property to backup value
// await reset_theme_property(config, "titleBar.activeBackground");

// // Reset entire theme to backup
// await reset_theme_to_backup(config);

import { Config } from "../../../config/config";
import { THEME_BACKGROUND } from "../../../utils/constants";

import * as fs from "fs";
import * as path from "path";
import { getUserThemeVarAsync } from "../../user-vars/handle_user_vars";

// Theme configuration for theme JSON settings
import { UserThemeVars } from "../../user-vars/handle_user_vars";

interface ThemePropertyConfig {
  [themeProperty: string]: {
    userVarKey: keyof UserThemeVars;
    defaultValue: string;
  };
}

// Define which theme properties map to which user theme variables
const THEME_PROPERTY_MAPPING: ThemePropertyConfig = {
  "colors.titleBar.activeBackground": {
    userVarKey: "background",
    defaultValue: THEME_BACKGROUND,
  },
  "colors.titleBar.inactiveBackground": {
    userVarKey: "background",
    defaultValue: THEME_BACKGROUND,
  },
  // Add more mappings here as needed
  // "colors.statusBar.background": {
  //     userVarKey: "accent",
  //     defaultValue: THEME_ACCENT
  // },
  // "colors.activityBar.background": {
  //     userVarKey: "dark-color",
  //     defaultValue: THEME_DARK_BACKGROUND
  // }
};

/**
 * Get theme file paths from config
 */
function getThemePaths(config: Config): { main: string; backup: string } {
  // Get the main theme path
  const mainThemePath = config.paths.our_theme_json;

  if (!mainThemePath) {
    throw new Error("No current theme JSON path found in config");
  }

  // Construct backup path - same directory, add '-backup' before extension
  const themeDir = path.dirname(mainThemePath);
  const themeFileName = path.basename(mainThemePath, ".json");
  const backupThemePath = path.join(themeDir, `${themeFileName}-backup.json`);

  return {
    main: mainThemePath,
    backup: backupThemePath,
  };
}

/**
 * Update a specific property in the theme JSON content without affecting formatting
 */
async function updateThemePropertyInContent(
  content: string,
  propertyPath: string,
  newValue: string,
): Promise<{ updated: boolean; content: string }> {
  const lines = content.split("\n");
  let updated = false;

  // Handle nested properties (e.g., "colors.titleBar.activeBackground")
  const propertyParts = propertyPath.split(".");

  if (propertyParts.length === 1) {
    // Simple property - no nesting
    const escapedProperty = propertyParts[0].replace(
      /[.*+?^${}()|[\]\\]/g,
      "\\$&",
    );
    const propertyRegex = new RegExp(
      `^(\\s*"${escapedProperty}"\\s*:\\s*)[^,\\n]+(,?)\\s*$`,
    );

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const match = line.match(propertyRegex);
      if (match) {
        const [fullMatch, beforeValue, comma] = match;
        lines[i] = `${beforeValue}"${newValue}"${comma}`;
        updated = true;
        break;
      }
    }
  } else {
    // For nested properties like "colors.titleBar.activeBackground"
    // The actual property name is everything after the first dot
    const parentSection = propertyParts[0]; // "colors"
    const actualPropertyName = propertyParts.slice(1).join("."); // "titleBar.activeBackground"

    let currentPath: string[] = [];
    let inTargetSection = false;

    const escapedProperty = actualPropertyName.replace(
      /[.*+?^${}()|[\]\\]/g,
      "\\$&",
    );
    const propertyRegex = new RegExp(
      `^(\\s*"${escapedProperty}"\\s*:\\s*)[^,\\n]+(,?)\\s*$`,
    );

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const trimmedLine = line.trim();

      // Skip comments
      if (trimmedLine.startsWith("//") || trimmedLine.startsWith("/*")) {
        continue;
      }

      // Check for section start
      const sectionMatch = trimmedLine.match(/^"([^"]+)"\s*:\s*\{/);
      if (sectionMatch) {
        currentPath.push(sectionMatch[1]);
        inTargetSection = sectionMatch[1] === parentSection;
        continue;
      }

      // Check for closing brace
      if (trimmedLine === "}") {
        if (currentPath.length > 0) {
          if (currentPath[currentPath.length - 1] === parentSection) {
            inTargetSection = false;
          }
          currentPath.pop();
        }
        continue;
      }

      // If we're in the target section, look for our property
      if (inTargetSection) {
        const match = line.match(propertyRegex);
        if (match) {
          const [fullMatch, beforeValue, comma] = match;
          lines[i] = `${beforeValue}"${newValue}"${comma}`;
          updated = true;
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
 * Add a new property to the theme JSON content
 * Fixed version with better nested property handling
 */
async function addThemePropertyToContent(
  content: string,
  propertyPath: string,
  value: string,
): Promise<string> {
  const lines = content.split("\n");
  const propertyParts = propertyPath.split(".");

  if (propertyParts.length === 1) {
    // Simple property, add to root level
    return addSimplePropertyToContent(content, propertyPath, value);
  }

  // Handle nested properties - find the parent section
  const parentSection = propertyParts[0]; // "colors"
  const actualPropertyName = propertyParts.slice(1).join("."); // "titleBar.activeBackground"

  let currentPath: string[] = [];
  let insertIndex = -1;
  let indentation = "        "; // Default indentation

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmedLine = line.trim();

    // Skip comments
    if (trimmedLine.startsWith("//") || trimmedLine.startsWith("/*")) {
      continue;
    }

    // Check for section start
    const sectionMatch = trimmedLine.match(/^"([^"]+)"\s*:\s*\{/);
    if (sectionMatch) {
      currentPath.push(sectionMatch[1]);

      // If we've reached our target parent section, capture indentation
      if (sectionMatch[1] === parentSection) {
        const match = line.match(/^(\s*)/);
        if (match) {
          indentation = match[1] + "    "; // Add one more level of indentation
        }
      }
      continue;
    }

    // Check for closing brace
    if (trimmedLine === "}") {
      // If we're closing our target section, this is where we insert
      if (
        currentPath.length > 0 &&
        currentPath[currentPath.length - 1] === parentSection
      ) {
        insertIndex = i;
        break;
      }

      if (currentPath.length > 0) {
        currentPath.pop();
      }
      continue;
    }
  }

  if (insertIndex === -1) {
    throw new Error(
      `Could not find target section "${parentSection}" for property: ${propertyPath}`,
    );
  }

  // Check if we need to add a comma to the previous property
  for (let i = insertIndex - 1; i >= 0; i--) {
    const line = lines[i].trim();
    if (
      line &&
      !line.startsWith("//") &&
      !line.startsWith("/*") &&
      line !== "{"
    ) {
      if (!line.endsWith(",")) {
        lines[i] = lines[i] + ",";
      }
      break;
    }
  }

  // Insert the new property
  const newPropertyLine = `${indentation}"${actualPropertyName}": "${value}"`;
  lines.splice(insertIndex, 0, newPropertyLine);

  return lines.join("\n");
}

/**
 * Add a simple (non-nested) property to content
 */
function addSimplePropertyToContent(
  content: string,
  propertyName: string,
  value: string,
): string {
  const lines = content.split("\n");
  let insertIndex = -1;
  let indentation = "    ";

  // Find the closing brace of the root object
  for (let i = lines.length - 1; i >= 0; i--) {
    const line = lines[i];
    const trimmed = line.trim();

    if (trimmed === "}") {
      insertIndex = i;
      break;
    }

    // Capture indentation from existing properties
    if (trimmed.includes(":") && !trimmed.startsWith("//")) {
      const match = line.match(/^(\s*)/);
      if (match) {
        indentation = match[1];
      }
    }
  }

  if (insertIndex === -1) {
    return `{\n    "${propertyName}": "${value}"\n}`;
  }

  // Add comma to previous property if needed
  for (let i = insertIndex - 1; i >= 0; i--) {
    const line = lines[i].trim();
    if (line && !line.startsWith("//") && !line.startsWith("/*")) {
      if (!line.endsWith(",") && line !== "{") {
        lines[i] = lines[i] + ",";
      }
      break;
    }
  }

  const newPropertyLine = `${indentation}"${propertyName}": "${value}"`;
  lines.splice(insertIndex, 0, newPropertyLine);

  return lines.join("\n");
}

/**
 * Read theme JSON file
 */
async function readThemeFile(filePath: string): Promise<string> {
  try {
    if (!fs.existsSync(filePath)) {
      throw new Error(`Theme file not found: ${filePath}`);
    }

    const content = await fs.promises.readFile(filePath, "utf-8");
    return content;
  } catch (error) {
    throw new Error(`Failed to read theme file: ${error}`);
  }
}

/**
 * Write theme JSON file
 */
async function writeThemeFile(
  filePath: string,
  content: string,
): Promise<void> {
  try {
    await fs.promises.writeFile(filePath, content, "utf-8");
    console.log(`Theme file updated: ${filePath}`);
  } catch (error) {
    throw new Error(`Failed to write theme file: ${error}`);
  }
}

/**
 * Set a specific property in the theme JSON file
 */
export async function set_theme_property(
  config: Config,
  propertyPath: string,
  value: string,
): Promise<void> {
  try {
    const { main } = getThemePaths(config);

    // Read current theme content
    const content = await readThemeFile(main);

    // Try to update existing property
    const updateResult = await updateThemePropertyInContent(
      content,
      propertyPath,
      value,
    );

    let finalContent: string;
    if (updateResult.updated) {
      finalContent = updateResult.content;
    } else {
      // Property doesn't exist, add it
      finalContent = await addThemePropertyToContent(
        content,
        propertyPath,
        value,
      );
    }

    // Write updated content
    await writeThemeFile(main, finalContent);

    console.log(`Theme property "${propertyPath}" set to "${value}"`);
  } catch (error) {
    throw new Error(`Failed to set theme property: ${error}`);
  }
}

/**
 * Set a theme property using a user theme variable
 */
export async function set_theme_property_with_var(
  config: Config,
  propertyPath: string,
  userVarKey: keyof UserThemeVars,
  defaultValue: string,
): Promise<void> {
  try {
    const value = await getUserThemeVarAsync(config, userVarKey, defaultValue);
    await set_theme_property(config, propertyPath, value);
  } catch (error) {
    throw new Error(`Failed to set theme property with variable: ${error}`);
  }
}

/**
 * Apply multiple theme property mappings
 */
export async function apply_theme_mappings(
  config: Config,
  themeMapping: ThemePropertyConfig = THEME_PROPERTY_MAPPING,
): Promise<boolean> {
  try {
    const appliedProperties: string[] = [];

    for (const [propertyPath, themeConfig] of Object.entries(themeMapping)) {
      const value = await getUserThemeVarAsync(
        config,
        themeConfig.userVarKey,
        themeConfig.defaultValue,
      );
      await set_theme_property(config, propertyPath, value);
      appliedProperties.push(propertyPath);
    }

    console.log("Applied theme mappings:", appliedProperties);
    return true;
  } catch (error) {
    return false;
  }
}

/**
 * Reset a specific property to its backup value
 */
export async function reset_theme_property(
  config: Config,
  propertyPath: string,
): Promise<void> {
  try {
    const { main, backup } = getThemePaths(config);

    // Read backup content to get original value
    const backupContent = await readThemeFile(backup);

    // Extract the property value from backup
    const backupUpdateResult = await updateThemePropertyInContent(
      backupContent,
      propertyPath,
      "PLACEHOLDER",
    );

    if (!backupUpdateResult.updated) {
      console.log(
        `Property "${propertyPath}" not found in backup, skipping reset`,
      );
      return;
    }

    // Parse backup to get the actual value (this is a simplified approach)
    // In a real implementation, you might want to use a proper JSON parser for this
    const lines = backupContent.split("\n");
    const propertyParts = propertyPath.split(".");
    const finalProperty = propertyParts[propertyParts.length - 1];
    const escapedProperty = finalProperty.replace(
      /[.*+?^${}()|[\]\\]/g,
      "\\$&",
    );
    const propertyRegex = new RegExp(
      `^\\s*"${escapedProperty}"\\s*:\\s*"([^"]*)"[,]?\\s*$`,
    );

    let backupValue: string | null = null;
    for (const line of lines) {
      const match = line.match(propertyRegex);
      if (match) {
        backupValue = match[1];
        break;
      }
    }

    if (backupValue !== null) {
      await set_theme_property(config, propertyPath, backupValue);
      console.log(
        `Theme property "${propertyPath}" reset to backup value: "${backupValue}"`,
      );
    } else {
      console.log(
        `Could not extract backup value for property: ${propertyPath}`,
      );
    }
  } catch (error) {
    throw new Error(`Failed to reset theme property: ${error}`);
  }
}

/**
 * Reset entire theme to backup
 */
export async function reset_theme_to_backup(config: Config): Promise<void> {
  try {
    const { main, backup } = getThemePaths(config);

    // Read backup content
    const backupContent = await readThemeFile(backup);

    // Copy backup content to main theme file
    await writeThemeFile(main, backupContent);

    console.log("Theme reset to backup successfully");
  } catch (error) {
    throw new Error(`Failed to reset theme to backup: ${error}`);
  }
}

// Helper function to create custom theme mapping
export function createCustomThemeMapping(mappings: {
  [propertyPath: string]: {
    userVarKey: keyof UserThemeVars;
    defaultValue: string;
  };
}): ThemePropertyConfig {
  return mappings;
}

// Example theme configurations:
export const TITLE_BAR_THEME_MAPPING = createCustomThemeMapping({
  "colors.titleBar.activeBackground": {
    userVarKey: "background",
    defaultValue: THEME_BACKGROUND,
  },
  "colors.titleBar.inactiveBackground": {
    userVarKey: "background",
    defaultValue: THEME_BACKGROUND,
  },
});

export const ACCENT_THEME_MAPPING = createCustomThemeMapping({
  "colors.titleBar.activeBackground": {
    userVarKey: "accent",
    defaultValue: THEME_BACKGROUND,
  },
  "colors.titleBar.inactiveBackground": {
    userVarKey: "accent",
    defaultValue: THEME_BACKGROUND,
  },
});

// Re-export the original VSCode settings functions for other uses
export {
  set_custom_settings,
  remove_custom_settings,
  set_specific_property as set_vscode_specific_property,
  set_property_with_color as set_vscode_property_with_color,
  remove_specific_property as remove_vscode_specific_property,
} from "./handle-add-remove-settings";
