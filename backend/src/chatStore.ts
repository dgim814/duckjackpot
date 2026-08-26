import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { DATA_DIR } from './config.js'

const FILE = join(DATA_DIR, 'chats.json')

export type BotChat = {
  telegramId: number
  chatId: number
  username?: string
  firstName?: string
  startedAt: number
}

type Store = Record<string, BotChat>

function readStore(): Store {
  try {
    if (!existsSync(FILE)) return {}
    const parsed = JSON.parse(readFileSync(FILE, 'utf8')) as Store
    return parsed && typeof parsed === 'object' ? parsed : {}
  } catch {
    return {}
  }
}

function writeStore(store: Store) {
  mkdirSync(DATA_DIR, { recursive: true })
  writeFileSync(FILE, JSON.stringify(store))
}

export function rememberChat(params: {
  telegramId: number
  chatId: number
  username?: string
  firstName?: string
}) {
  const store = readStore()
  const prev = store[String(params.telegramId)]
  store[String(params.telegramId)] = {
    telegramId: params.telegramId,
    chatId: params.chatId,
    username: params.username ?? prev?.username,
    firstName: params.firstName ?? prev?.firstName,
    startedAt: prev?.startedAt ?? Date.now(),
  }
  writeStore(store)
}

export function getChat(telegramId: number): BotChat | undefined {
  return readStore()[String(telegramId)]
}
