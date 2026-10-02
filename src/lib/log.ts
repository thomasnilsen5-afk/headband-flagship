/**
 * Structured JSON logging. Vercel and Sentry ingest one JSON object per line; never log
 * secrets, full card data or addresses (PII) — pass ids instead.
 */
type Level = 'debug' | 'info' | 'warn' | 'error'
type Fields = Record<string, unknown>

function emit(level: Level, msg: string, fields?: Fields) {
  const line = JSON.stringify({
    level,
    msg,
    time: new Date().toISOString(),
    env: process.env.VERCEL_ENV ?? process.env.NODE_ENV,
    ...fields,
    ...(fields?.err instanceof Error
      ? { err: { name: fields.err.name, message: fields.err.message, stack: fields.err.stack } }
      : {}),
  })
  if (level === 'error') console.error(line)
  else if (level === 'warn') console.warn(line)
  else if (process.env.NODE_ENV !== 'test') process.stdout?.write?.(line + '\n')
}

export const log = {
  debug: (msg: string, f?: Fields) =>
    process.env.NODE_ENV !== 'production' && emit('debug', msg, f),
  info: (msg: string, f?: Fields) => emit('info', msg, f),
  warn: (msg: string, f?: Fields) => emit('warn', msg, f),
  error: (msg: string, f?: Fields) => emit('error', msg, f),
  child: (base: Fields) => ({
    info: (msg: string, f?: Fields) => emit('info', msg, { ...base, ...f }),
    warn: (msg: string, f?: Fields) => emit('warn', msg, { ...base, ...f }),
    error: (msg: string, f?: Fields) => emit('error', msg, { ...base, ...f }),
  }),
}
