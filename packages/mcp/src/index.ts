#!/usr/bin/env node
import { runServer } from './server'

runServer().catch((error) => {
  process.stderr.write(`stacklane-mcp failed: ${error instanceof Error ? error.message : String(error)}\n`)
  process.exit(1)
})
