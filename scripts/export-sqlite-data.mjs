import fs from "node:fs/promises"
import path from "node:path"
import { execFile } from "node:child_process"
import { promisify } from "node:util"

const execFileAsync = promisify(execFile)

const sourceDb = process.env.SQLITE_SOURCE_PATH || "prisma/dev.db"
const outputPath =
  process.env.SQLITE_EXPORT_PATH || "prisma/sqlite-export.json"

const tables = [
  "User",
  "Category",
  "Identity",
  "VaultItem",
  "TagPreset",
  "Tag",
  "Subscription",
  "ReminderRule",
  "NotificationChannel",
  "NotificationDispatchLog",
]

async function queryTable(dbPath, table) {
  const exists = await execFileAsync("sqlite3", [
    dbPath,
    `SELECT name FROM sqlite_master WHERE type='table' AND name='${table}';`,
  ])

  if (!exists.stdout.trim()) {
    return []
  }

  const { stdout } = await execFileAsync("sqlite3", [
    dbPath,
    "-json",
    `SELECT * FROM "${table}";`,
  ])

  const trimmed = stdout.trim()
  return trimmed ? JSON.parse(trimmed) : []
}

async function main() {
  const resolvedOutput = path.resolve(outputPath)
  const payload = {}

  for (const table of tables) {
    payload[table] = await queryTable(sourceDb, table)
  }

  await fs.mkdir(path.dirname(resolvedOutput), { recursive: true })
  await fs.writeFile(
    resolvedOutput,
    JSON.stringify(
      {
        exportedAt: new Date().toISOString(),
        sourceDb,
        tables: payload,
      },
      null,
      2
    )
  )

  console.log(`SQLite 数据已导出到 ${resolvedOutput}`)
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
