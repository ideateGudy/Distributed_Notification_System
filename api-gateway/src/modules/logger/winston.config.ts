import * as winston from 'winston';
import * as path from 'path';
import * as fs from 'fs';
import DailyRotateFile from 'winston-daily-rotate-file';

// ---------- Helper: create today's log directory ----------
const getLogFolderForToday = () => {
  const today = new Date().toISOString().split('T')[0];
  const logDir = path.resolve(process.cwd(), `logs/${today}`);
  if (!fs.existsSync(logDir)) {
    fs.mkdirSync(logDir, { recursive: true });
  }
  return logDir;
};

const logDir = getLogFolderForToday();

const { combine, timestamp, errors, colorize, json, splat, simple, align } =
  winston.format;

export const appLogger = winston.createLogger({
  level: process.env.NODE_ENV === 'production' ? 'info' : 'debug',
  format: combine(
    timestamp({ format: 'YYYY-MM-DD hh:mm:ss.SSS A' }),
    errors({ stack: true }),
    colorize({ all: true }),
    splat(),
    align(),
    json(),
  ),
  defaultMeta: { appName: 'Distributed Notification System' },
  transports: [
    new winston.transports.Console({
      format: combine(colorize(), simple()),
    }),
    new DailyRotateFile({
      filename: path.join(logDir, 'combined-%DATE%.log'),
      datePattern: 'YYYY-MM-DD',
      maxFiles: '2d',
      zippedArchive: true,
      format: combine(timestamp(), json()),
    }),
    new DailyRotateFile({
      filename: path.join(logDir, 'error-%DATE%.log'),
      level: 'error',
      datePattern: 'YYYY-MM-DD',
      maxFiles: '2d',
      zippedArchive: true,
    }),
  ],
});

appLogger.add(
  new DailyRotateFile({
    filename: path.join(logDir, 'exception-%DATE%.log'),
    level: 'error',
    handleExceptions: true,
    maxFiles: '5d',
    zippedArchive: true,
  }),
);

appLogger.add(
  new DailyRotateFile({
    filename: path.join(logDir, 'rejections-%DATE%.log'),
    level: 'error',
    handleRejections: true,
    maxFiles: '5d',
    zippedArchive: true,
  }),
);
