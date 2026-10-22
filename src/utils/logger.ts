export const logger = {
  log: (message: string, ...args: any[]) => console.log(`[Tuko Log]: ${message}`, ...args),
  error: (message: string, error?: any) => console.error(`[Tuko Error]: ${message}`, error),
  warn: (message: string, ...args: any[]) => console.warn(`[Tuko Warn]: ${message}`, ...args),
};
