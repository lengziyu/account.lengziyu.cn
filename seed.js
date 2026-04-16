const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const prisma = new PrismaClient();

async function main() {
  const hash = await bcrypt.hash('admin123', 10);
  const user = await prisma.user.upsert({
    where: { email: 'admin' },
    update: { passwordHash: hash },
    create: { email: 'admin', passwordHash: hash, name: 'Admin' }
  });
  console.log('User created/updated: admin / admin123');
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
