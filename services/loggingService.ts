export type LogLevel = 'info' | 'warn' | 'error';

export interface LogEntry {
  timestamp: string;
  level: LogLevel;
  message: string;
}

type LogListener = (logs: LogEntry[]) => void;

class LoggingService {
  private logs: LogEntry[] = [];
  private listeners: Set<LogListener> = new Set();
  private maxLogs = 200;

  private addLog(level: LogLevel, message: string) {
    const newLog: LogEntry = {
      timestamp: new Date().toLocaleTimeString(),
      level,
      message,
    };
    
    // Add to the beginning of the array to show newest first
    this.logs = [newLog, ...this.logs];
    if (this.logs.length > this.maxLogs) {
        this.logs = this.logs.slice(0, this.maxLogs);
    }
    
    this.notify();
  }

  private notify() {
    this.listeners.forEach(listener => listener([...this.logs]));
  }

  subscribe(listener: LogListener) {
    this.listeners.add(listener);
    // Immediately notify with current logs
    listener([...this.logs]);
    return () => this.unsubscribe(listener);
  }

  unsubscribe(listener: LogListener) {
    this.listeners.delete(listener);
  }

  getLogs(): LogEntry[] {
    return [...this.logs];
  }

  log(message: string) {
    this.addLog('info', message);
    console.log(`[INFO] ${message}`);
  }

  warn(message: string) {
    this.addLog('warn', message);
    console.warn(`[WARN] ${message}`);
  }

  error(message: string, error?: any) {
    const fullMessage = error instanceof Error ? `${message} Details: ${error.message}` : message;
    this.addLog('error', fullMessage);
    console.error(`[ERROR] ${fullMessage}`, error);
  }
  
  clear() {
      this.logs = [];
      this.notify();
  }
}

export const logger = new LoggingService();
