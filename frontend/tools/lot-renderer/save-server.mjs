// Local helper: receives rendered PNGs from the renderer page and writes them to disk.
import { createServer } from 'node:http'
import { mkdirSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'

const dir = process.argv[2]
mkdirSync(dir, { recursive: true })
createServer((req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', '*')
  res.setHeader('Access-Control-Allow-Private-Network', 'true')
  if (req.method === 'OPTIONS') return res.end()
  const m = /^\/save\/([\w.-]+\.png)$/.exec(req.url || '')
  if (req.method !== 'POST' || !m) {
    res.statusCode = 404
    return res.end()
  }
  const chunks = []
  req.on('data', (c) => chunks.push(c))
  req.on('end', () => {
    writeFileSync(join(dir, m[1]), Buffer.concat(chunks))
    res.end('ok')
  })
}).listen(5199, () => console.log('save server on 5199 →', dir))
