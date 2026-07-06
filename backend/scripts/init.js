const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const company = await prisma.company.upsert({
    where: { id: 'cm2abc123' },
    update: {},
    create: {
      id: 'cm2abc123',
      name: 'Kerabeaute',
      logo: 'kerabeaute_logo.png',
      tagline: 'Art of Flawless Haircare',
      brandColor: '#EAB308'
    }
  });

  console.log('✅ Default company created on Render:', company.name);
}

main()
  .catch(e => console.error(e))
  .finally(() => prisma.$disconnect());
