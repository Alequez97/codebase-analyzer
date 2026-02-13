/**
 * Logger utility for centralized logging
 * Allows easy configuration of log levels and output destinations
 */

export const LOG_LEVELS = {
  ERROR: 0,
  WARN: 1,
  INFO: 2,
  DEBUG: 3,
};

// Default configuration
const config = {
  level: LOG_LEVELS.INFO,
  enableTimestamps: true,
  outputs: [console], // Can add file streams, etc.
};

/**
 * Configure logger settings
 * @param {Object} options - Configuration options
 * @param {number} options.level - Minimum log level to display
 * @param {boolean} options.enableTimestamps - Include timestamps
 * @param {Array} options.outputs - Array of output destinations
 */
export function configure(options) {
  Object.assign(config, options);
}

/**
 * Format log message with optional timestamp
 */
function format(level, message, context) {
  let formatted = "";

  if (config.enableTimestamps) {
    formatted += `${new Date().toISOString()} `;
  }

  formatted += `[${level}] ${message}`;

  if (context) {
    formatted += ` ${JSON.stringify(context)}`;
  }

  return formatted;
}

/**
 * Write log to all configured outputs
 */
function write(level, message, context, method = "log") {
  const formatted = format(level, message, context);

  config.outputs.forEach((output) => {
    if (output[method]) {
      output[method](formatted);
    } else if (output.write) {
      output.write(formatted + "\n");
    }
  });
}

/**
 * Log error message
 * @param {string} message - Error message
 * @param {Object|Error} context - Additional context or error object
 */
export function error(message, context) {
  if (config.level >= LOG_LEVELS.ERROR) {
    // If context is an Error, extract useful info
    if (context instanceof Error) {
      context = {
        message: context.message,
        stack: context.stack,
        ...context,
      };
    }
    write("ERROR", message, context, "error");
  }
}

/**
 * Log warning message
 * @param {string} message - Warning message
 * @param {Object} context - Additional context
 */
export function warn(message, context) {
  if (config.level >= LOG_LEVELS.WARN) {
    write("WARN", message, context, "warn");
  }
}

/**
 * Log info message
 * @param {string} message - Info message
 * @param {Object} context - Additional context
 */
export function info(message, context) {
  if (config.level >= LOG_LEVELS.INFO) {
    write("INFO", message, context, "log");
  }
}

/**
 * Log debug message
 * @param {string} message - Debug message
 * @param {Object} context - Additional context
 */
export function debug(message, context) {
  if (config.level >= LOG_LEVELS.DEBUG) {
    write("DEBUG", message, context, "log");
  }
}

/**
 * Log HTTP request
 * @param {string} method - HTTP method
 * @param {string} path - Request path
 */
export function http(method, path) {
  info(`${method} ${path}`);
}

/**
 * Simple log without level filtering
 * @param {string} message - Message
 */
export function log(message) {
  console.log(message);
}
