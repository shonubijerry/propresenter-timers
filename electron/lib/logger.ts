import path from 'path';
import fs from 'fs';

/**
 * A simple class for file-based logging.
 */
export class Logger {
  private logStream: fs.WriteStream | null = null;

  /**
   * Initializes the logging system, creating a write stream to the specified path.
   * @param appDataPath The directory where the log file should be created.
   * @param logFileName The name of the log file (defaults to 'app.log').
   */
  public initialize(appDataPath: string, logFileName: string = 'app.log'): void {
    if (this.logStream) {
      console.warn('Logger already initialized. Closing previous stream.');
      this.close();
    }

    try {
      const logPath = path.join(appDataPath, logFileName);
      this.logStream = fs.createWriteStream(logPath, { flags: 'w' });
      this.log('Logger initialized successfully.');
    } catch (error) {
      // It's usually better to log to console if file logging fails
      // to ensure the error is seen.
      console.error('Failed to initialize logging:', error);
      this.logStream = null; // Ensure the stream is null if creation fails
    }
  }

  /**
   * Writes a message with a timestamp to the log file.
   * Does nothing if the logger hasn't been initialized.
   * @param message The message to log.
   */
  public log(message: string): void {
    const line = `[${new Date().toISOString()}] ${message}\n`;

    // Also log to console for immediate feedback during development/testing
    // or as a fallback if the stream is null.
    // console.log(line.trim());

    if (this.logStream) {
      this.logStream.write(line);
    }
  }

  /**
   * Closes the underlying file stream. Should be called when the application
   * is shutting down.
   */
  public close(): void {
    if (this.logStream) {
      this.log('Logger closing stream...');
      this.logStream.end();
      this.logStream = null;
    }
  }
}

export const logger = new Logger();
