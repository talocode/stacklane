#!/usr/bin/env node

// Monkey-patch os.networkInterfaces() for environments where
// uv_interface_addresses returns EACCES / "Unknown system error 13".
// This is a known issue in restricted containers (Codespaces, Termux, etc.).

const os = require('os')
const path = require('path')

const original = os.networkInterfaces.bind(os)
os.networkInterfaces = function () {
  try {
    const result = original()
    if (result && Object.keys(result).length > 0) return result
  } catch {}
  return { 'lo0': [{ address: '127.0.0.1', netmask: '255.0.0.0', family: 'IPv4', internal: true }] }
}

// Forward to Next.js CLI
const nextDir = path.resolve(__dirname, '..', 'node_modules', 'next', 'dist', 'bin', 'next')
require(nextDir)
