import { PrismaClient } from "@prisma/client"
import bcrypt from "bcryptjs"

const prisma = new PrismaClient()

async function main() {
  const email = process.env.RESET_USER_EMAIL?.trim() || "admin"
  const password = process.env.RESET_USER_PASSWORD?.trim()

  if (!password) {
    throw new Error("缺少 RESET_USER_PASSWORD 环境变量")
  }

  const existing = await prisma.user.findUnique({
    where: { email },
    select: { id: true, email: true },
  })

  if (!existing) {
    throw new Error(`未找到用户：${email}`)
  }

  const passwordHash = await bcrypt.hash(password, 10)

  await prisma.user.update({
    where: { email },
    data: { passwordHash },
  })

  console.log(`已重置用户密码：${email}`)
}

main()
  .catch((error) => {
    console.error(error.message || error)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
