import { app } from 'electron';
import * as path from 'path';
import * as fs from 'fs';

type LogLevel = 'INFO' | 'WARN' | 'ERROR' | 'DEBUG';

interface LogEntry {
  timestamp: string;
  level: LogLevel;
  message: string;
  data?: unknown;
}

class UpdaterLogger {
  private _logPath: string | null = null;
  private _stream: fs.WriteStream | null = null;

  // Lazy-init so the singleton can be imported before app.whenReady()
  private get logPath(): string {
    if (!this._logPath) {
      const logsDir = path.join(app.getPath('userData'), 'logs');
      if (!fs.existsSync(logsDir)) fs.mkdirSync(logsDir, { recursive: true });
      this._logPath = path.join(logsDir, 'updater.log');
    }
    return this._logPath;
  }

  private get stream(): fs.WriteStream {
    if (!this._stream) {
      this._stream = fs.createWriteStream(this.logPath, { flags: 'a' });
    }
    return this._stream;
  }

  private write(level: LogLevel, message: string, data?: unknown): void {
    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level,
      message,
      ...(data !== undefined && { data }),
    };

    try {
      this.stream.write(JSON.stringify(entry) + '\n');
    } catch {
      // Never crash the app because of a log write failure
    }

    const prefix = `[Updater][${level}]`;
    if (level === 'ERROR') {
      console.error(prefix, message, data ?? '');
    } else if (process.env.ELECTRON_ENV === 'development' || level !== 'DEBUG') {
      console.log(prefix, message, data ?? '');
    }
  }

  info(message: string, data?: unknown): void  { this.write('INFO',  message, data); }
  warn(message: string, data?: unknown): void  { this.write('WARN',  message, data); }
  error(message: string, data?: unknown): void { this.write('ERROR', message, data); }
  debug(message: string, data?: unknown): void { this.write('DEBUG', message, data); }

  getLogPath(): string { return this.logPath; }
}

// Module-level singleton — safe because file handle is lazy-initialised on first use
export const updaterLogger = new UpdaterLogger();
