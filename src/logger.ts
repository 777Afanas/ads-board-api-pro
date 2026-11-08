import pino from 'pino'

const logger = pino({
  level: 'info', 
  redact: {
    paths: ["req.headers.authorization", "req.headers.cookie"],
    censor: "[REDACTED]", 
  },   
  transport: {
    target: 'pino-pretty',
  },
})

export default logger