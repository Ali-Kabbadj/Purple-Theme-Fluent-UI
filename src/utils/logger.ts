/**
 * Custom logger class for the theme-editor-pro VSCode extension
 * Provides formatted logging with emojis for improved readability in the Debug Console
 */
export class PurpleLogger {
  private static readonly EXTENSION_NAME = "theme-editor-pro";
  private readonly className: string;

  /**
   * Creates a new PurpleLogger instance
   * @param className The name of the class or function using this logger
   */
  constructor(className: string) {
    this.className = className;
  }

  /**
   * Formats a message according to the specified pattern
   * @param level The log level (info, error, warn, etc.)
   * @param message The message to log
   * @param data Optional data to include in the log
   * @returns Formatted log message
   */
  private format(
    level: string,
    emoji: string,
    message: string,
    data?: any,
  ): { message: string; data?: any } {
    const extensionPart = `\x1b[35m[${PurpleLogger.EXTENSION_NAME}]\x1b[0m`;
    const classPart = `\x1b[36m[${this.className}]\x1b[0m`;
    const levelPart = `\x1b[33m[${level}]\x1b[0m`;

    const formattedMessage = `${emoji} ${extensionPart}${classPart}${levelPart}: ${message}`;

    // Return the message and data separately to allow console to display objects natively
    return {
      message: formattedMessage,
      data: data !== undefined ? data : undefined,
    };
  }

  /**
   * Log an informational message
   * @param message The message to log
   * @param data Optional data to include
   */
  info(message: string, data?: any): void {
    const formatted = this.format("INFO", "🔷", message, data);
    console.log(
      formatted.message,
      formatted.data !== undefined ? formatted.data : "",
    );
  }

  /**
   * Log a general message
   * @param message The message to log
   * @param data Optional data to include
   */
  log(message: string, data?: any): void {
    const formatted = this.format("LOG", "📝", message, data);
    console.log(
      formatted.message,
      formatted.data !== undefined ? formatted.data : "",
    );
  }

  /**
   * Log a success message
   * @param message The message to log
   * @param data Optional data to include
   */
  success(message: string, data?: any): void {
    const formatted = this.format("SUCCESS", "✅", message, data);
    console.log(
      formatted.message,
      formatted.data !== undefined ? formatted.data : "",
    );
  }

  /**
   * Log a warning message
   * @param message The message to log
   * @param data Optional data to include
   */
  warn(message: string, data?: any): void {
    const formatted = this.format("WARN", "⚠️", message, data);
    console.warn(
      formatted.message,
      formatted.data !== undefined ? formatted.data : "",
    );
  }

  /**
   * Log an error message
   * @param message The message to log
   * @param data Optional data to include
   */
  error(message: string, data?: any): void {
    const formatted = this.format("ERROR", "❌", message, data);
    console.error(
      formatted.message,
      formatted.data !== undefined ? formatted.data : "",
    );
  }

  /**
   * Log a debug message (only shown when debugging)
   * @param message The message to log
   * @param data Optional data to include
   */
  debug(message: string, data?: any): void {
    const formatted = this.format("DEBUG", "🔍", message, data);
    console.debug(
      formatted.message,
      formatted.data !== undefined ? formatted.data : "",
    );
  }

  /**
   * Log an event message
   * @param message The message to log
   * @param data Optional data to include
   */
  event(message: string, data?: any): void {
    const formatted = this.format("EVENT", "🔔", message, data);
    console.log(
      formatted.message,
      formatted.data !== undefined ? formatted.data : "",
    );
  }

  /**
   * Log a configuration message
   * @param message The message to log
   * @param data Optional data to include
   */
  config(message: string, data?: any): void {
    const formatted = this.format("CONFIG", "⚙️", message, data);
    console.log(
      formatted.message,
      formatted.data !== undefined ? formatted.data : "",
    );
  }

  /**
   * Create a child logger with a subclass/subcomponent name
   * @param subName The name of the subclass or subcomponent
   * @returns A new PurpleLogger instance
   */
  createSubLogger(subName: string): PurpleLogger {
    return new PurpleLogger(`${this.className}.${subName}`);
  }
}

/**
 * Create a logger for a specific component or function
 * @param componentName The name of the component or function
 * @returns A new PurpleLogger instance
 */
export function createLogger(componentName: string): PurpleLogger {
  return new PurpleLogger(componentName);
}

// Example usage:
// const logger = createLogger('activate_vscode_custom_ui_injector');
// logger.info('Extension activated');
// logger.debug('Configuration loaded', { setting1: true, setting2: 'value' });
// import * as vscode from "vscode";
// import { createLogger } from "./logger"; // Import your logger from the appropriate path

// export function activate_vscode_custom_ui_injector(
//   context: vscode.ExtensionContext,
// ): void {
//   // Create a logger instance for this function
//   const logger = createLogger("activate_vscode_custom_ui_injector");

//   logger.info("Starting UI injector activation");

//   try {
//     // Example registration of some commands
//     const disposable = vscode.commands.registerCommand(
//       "theme-editor-pro.applyTheme",
//       () => {
//         logger.event("Theme application requested");

//         // Your implementation here

//         logger.success("Theme applied successfully");
//       },
//     );

//     context.subscriptions.push(disposable);

//     // Example config logging
//     logger.config(
//       "Extension configuration",
//       vscode.workspace.getConfiguration("theme-editor-pro"),
//     );

//     // Example of creating a sub-logger for a specific component
//     const uiLogger = logger.createSubLogger("UIComponent");
//     uiLogger.debug("UI component initialized");

//     logger.success("UI injector activated successfully");
//   } catch (error) {
//     logger.error("Failed to activate UI injector", error);
//   }
// }
