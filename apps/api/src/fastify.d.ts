import type { StacklaneDb } from './db/client'

declare module 'fastify' {
  interface FastifyInstance {
    db: StacklaneDb
  }
}

export {}
