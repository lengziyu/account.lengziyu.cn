const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const prisma = new PrismaClient();

async function main() {
  const hash = await bcrypt.hash('len136214', 10);
  const user = await prisma.user.upsert({
    where: { email: 'len' },
    update: { passwordHash: hash },
    create: { email: 'len', passwordHash: hash, name: 'Len' }
  });
  console.log('User created/updated: len / len136214');
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
