function write(level, event, fields = {}) {
  const record = { time: new Date().toISOString(), level, event, ...fields }
  const output = JSON.stringify(record)
  if (level === 'error') console.error(output)
  else if (level === 'warn') console.warn(output)
  else console.log(output)
}

export const logger = {
  info: (event, fields) => write('info', event, fields),
  warn: (event, fields) => write('warn', event, fields),
  error: (event, fields) => write('error', event, fields),
}
