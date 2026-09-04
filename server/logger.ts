import * as winston from 'winston';
import 'winston-daily-rotate-file';

const {combine, timestamp, printf, colorize} = winston.format;

// Define your custom log format
const logFormat = printf(({level, message, timestamp}) => {
  return `${timestamp} [${level}]: ${message}`;
});

// Configure the daily rotate file transport
const dailyRotateFileTransport = new winston.transports.DailyRotateFile({
  filename: 'logs/app-%DATE%.log', // %DATE% will be replaced by the current date
  datePattern: 'YYYY-MM-DD', // Format of the date in the file name
  zippedArchive: true, // Compress older log files
  maxSize: '20m', // Maximum file size before creating a new log
  maxFiles: '14d', // Retain logs for 14 days
});

// Create the logger
const logger = winston.createLogger({
  level: 'info', // Log only if info.level is less than or equal to this
  format: combine(
    colorize(), // Add colors to logs (console only)
    timestamp({format: 'YYYY-MM-DD HH:mm:ss'}), // Add timestamps
    logFormat,
  ),
  transports: [
    // Write logs to the console
    new winston.transports.Console(),
    dailyRotateFileTransport,
  ],
});

// Export the logger for use in other modules
export default logger;
