import fs from "node:fs/promises"
import path from "node:path"
import { PrismaClient } from "@prisma/client"

const prisma = new PrismaClient()
const inputPath =
  process.env.SQLITE_EXPORT_PATH || "prisma/sqlite-export.json"

async function readExportFile() {
  const file = await fs.readFile(path.resolve(inputPath), "utf8")
  const parsed = JSON.parse(file)
  return parsed.tables || {}
}

function asDate(value) {
  return value ? new Date(value) : null
}

async function main() {
  const tables = await readExportFile()

  await prisma.$transaction(async (tx) => {
    await tx.notificationDispatchLog.deleteMany()
    await tx.reminderRule.deleteMany()
    await tx.notificationChannel.deleteMany()
    await tx.subscription.deleteMany()
    await tx.tag.deleteMany()
    await tx.tagPreset.deleteMany()
    await tx.vaultItem.deleteMany()
    await tx.identity.deleteMany()
    await tx.category.deleteMany()
    await tx.user.deleteMany()

    for (const item of tables.User || []) {
      await tx.user.create({
        data: {
          id: item.id,
          email: item.email,
          passwordHash: item.passwordHash,
          name: item.name,
          createdAt: asDate(item.createdAt) || undefined,
          updatedAt: asDate(item.updatedAt) || undefined,
        },
      })
    }

    for (const item of tables.Category || []) {
      await tx.category.create({
        data: {
          id: item.id,
          userId: item.userId,
          name: item.name,
          createdAt: asDate(item.createdAt) || undefined,
          updatedAt: asDate(item.updatedAt) || undefined,
        },
      })
    }

    for (const item of tables.Identity || []) {
      await tx.identity.create({
        data: {
          id: item.id,
          userId: item.userId,
          name: item.name,
          identifier: item.identifier,
          kind: item.kind,
          provider: item.provider,
          notes: item.notes,
          createdAt: asDate(item.createdAt) || undefined,
          updatedAt: asDate(item.updatedAt) || undefined,
        },
      })
    }

    for (const item of tables.VaultItem || []) {
      await tx.vaultItem.create({
        data: {
          id: item.id,
          userId: item.userId,
          identityId: item.identityId,
          title: item.title,
          displayTitle: item.displayTitle,
          platform: item.platform,
          url: item.url,
          username: item.username,
          password: item.password,
          category: item.category,
          notes: item.notes,
          favorite: !!item.favorite,
          createdAt: asDate(item.createdAt) || undefined,
          updatedAt: asDate(item.updatedAt) || undefined,
        },
      })
    }

    for (const item of tables.TagPreset || []) {
      await tx.tagPreset.create({
        data: {
          id: item.id,
          userId: item.userId,
          name: item.name,
          createdAt: asDate(item.createdAt) || undefined,
          updatedAt: asDate(item.updatedAt) || undefined,
        },
      })
    }

    for (const item of tables.Tag || []) {
      await tx.tag.create({
        data: {
          id: item.id,
          itemId: item.itemId,
          tag: item.tag,
          type: item.type,
        },
      })
    }

    for (const item of tables.Subscription || []) {
      await tx.subscription.create({
        data: {
          id: item.id,
          userId: item.userId,
          vaultItemId: item.vaultItemId,
          platformName: item.platformName,
          planName: item.planName,
          status: item.status,
          decision: item.decision,
          startedAt: asDate(item.startedAt),
          expiresAt: asDate(item.expiresAt) || new Date(),
          renewalCycle: item.renewalCycle,
          price: item.price,
          currency: item.currency,
          autoRenew: !!item.autoRenew,
          notes: item.notes,
          lastRenewedAt: asDate(item.lastRenewedAt),
          snoozeUntil: asDate(item.snoozeUntil),
          createdAt: asDate(item.createdAt) || undefined,
          updatedAt: asDate(item.updatedAt) || undefined,
        },
      })
    }

    for (const item of tables.ReminderRule || []) {
      await tx.reminderRule.create({
        data: {
          id: item.id,
          userId: item.userId,
          subscriptionId: item.subscriptionId,
          daysBefore: item.daysBefore,
          enabled: !!item.enabled,
          createdAt: asDate(item.createdAt) || undefined,
          updatedAt: asDate(item.updatedAt) || undefined,
        },
      })
    }

    for (const item of tables.NotificationChannel || []) {
      await tx.notificationChannel.create({
        data: {
          id: item.id,
          userId: item.userId,
          type: item.type,
          name: item.name,
          enabled: !!item.enabled,
          configJson: item.configJson,
          lastVerifiedAt: asDate(item.lastVerifiedAt),
          createdAt: asDate(item.createdAt) || undefined,
          updatedAt: asDate(item.updatedAt) || undefined,
        },
      })
    }

    for (const item of tables.NotificationDispatchLog || []) {
      await tx.notificationDispatchLog.create({
        data: {
          id: item.id,
          userId: item.userId,
          subscriptionId: item.subscriptionId,
          channelId: item.channelId,
          channelType: item.channelType,
          daysBefore: item.daysBefore,
          triggerDateKey: item.triggerDateKey,
          status: item.status,
          payloadSnapshot: item.payloadSnapshot,
          errorMessage: item.errorMessage,
          sentAt: asDate(item.sentAt),
          createdAt: asDate(item.createdAt) || undefined,
          updatedAt: asDate(item.updatedAt) || undefined,
        },
      })
    }
  })

  console.log(`SQLite 导出数据已导入 PostgreSQL：${path.resolve(inputPath)}`)
}

main()
  .catch((error) => {
    console.error(error)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
