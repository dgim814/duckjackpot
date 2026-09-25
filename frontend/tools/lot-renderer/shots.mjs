// QA screenshots of the Black Market at iPhone size via the Chrome DevTools Protocol.
// Usage: node shots.mjs <outDir> <name>=<query> ...
import { spawn } from 'node:child_process'
import { mkdirSync, writeFileSync } from 'node:fs'

const [outDir, ...jobs] = process.argv.slice(2)
mkdirSync(outDir, { recursive: true })
const chrome = spawn('/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', [
  '--headless=new', '--remote-debugging-port=9333', `--user-data-dir=${outDir}/.prof`, '--hide-scrollbars', 'about:blank',
], { stdio: 'ignore' })
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
let list
for (let i = 0; i < 50 && !list; i++) {
  await sleep(300)
  try { list = await (await fetch('http://127.0.0.1:9333/json/list')).json() } catch {}
}
const page = list.find((t) => t.type === 'page')
const ws = new WebSocket(page.webSocketDebuggerUrl)
await new Promise((r) => (ws.onopen = r))
let id = 0
const pending = new Map()
ws.onmessage = (e) => {
  const m = JSON.parse(e.data)
  if (m.id && pending.has(m.id)) { pending.get(m.id)(m); pending.delete(m.id) }
}
const send = (method, params = {}) => new Promise((r) => { const i = ++id; pending.set(i, r); ws.send(JSON.stringify({ id: i, method, params })) })
await send('Page.enable')
await send('Emulation.setDeviceMetricsOverride', { width: 375, height: 812, deviceScaleFactor: 2, mobile: true })
await send('Emulation.setTouchEmulationEnabled', { enabled: true })
for (const job of jobs) {
  const cut = job.indexOf('=')
  const name = job.slice(0, cut), query = job.slice(cut + 1)
  await send('Page.navigate', { url: `http://localhost:5173/tools/lot-renderer/market-preview.html?${query}` })
  for (let i = 0; i < 60; i++) {
    await sleep(250)
    const r = await send('Runtime.evaluate', { expression: "document.body.dataset.ready === '1'", returnByValue: true })
    if (r.result?.result?.value) break
  }
  await sleep(700)
  const st = await send('Runtime.evaluate', { expression: "JSON.stringify({url: location.search, ready: document.body.dataset.ready, head: document.querySelector('.bm-sec-head')?.textContent.slice(0, 20), y: scrollY})", returnByValue: true })
  console.log(name, st.result?.result?.value)
  const shot = await send('Page.captureScreenshot', { format: 'png' })
  writeFileSync(`${outDir}/${name}.png`, Buffer.from(shot.result.data, 'base64'))
  console.log('saved', name)
}
ws.close()
chrome.kill()
