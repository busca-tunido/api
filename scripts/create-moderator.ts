import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient, Role } from '@prisma/client';
import bcrypt from 'bcryptjs';
import { Pool } from 'pg';
import { env } from '../src/env.js';

const run = async (): Promise<void> => {
  const args = process.argv.slice(2);
  const emailArg = args[0] || env.PUBLIC_MODERATOR_EMAIL;
  if (!emailArg) {
    throw new Error(
      'Missing env var: PUBLIC_MODERATOR_EMAIL must be defined in environment (.env) or passed as argument.',
    );
  }

  const passwordArg = args[1] || env.MODERATOR_PASSWORD;
  if (!passwordArg) {
    throw new Error(
      'Missing env var: MODERATOR_PASSWORD must be defined in environment (.env) or passed as argument.',
    );
  }

  const firstNameArg = args[2] || env.PUBLIC_MODERATOR_FIRST_NAME;
  if (!firstNameArg) {
    throw new Error(
      'Missing env var: PUBLIC_MODERATOR_FIRST_NAME must be defined in environment (.env) or passed as argument.',
    );
  }

  const lastNameArg = args[3] || env.PUBLIC_MODERATOR_LAST_NAME;
  if (!lastNameArg) {
    throw new Error(
      'Missing env var: PUBLIC_MODERATOR_LAST_NAME must be defined in environment (.env) or passed as argument.',
    );
  }

  const pool = new Pool({ connectionString: env.DATABASE_URL });
  const adapter = new PrismaPg(pool);
  const prisma = new PrismaClient({ adapter });

  try {
    const email = emailArg.toLowerCase().trim();
    const existing = await prisma.user.findUnique({
      where: { email },
    });

    const passwordHash = await bcrypt.hash(passwordArg, 10);

    if (existing) {
      const updated = await prisma.user.update({
        where: { email },
        data: {
          role: Role.MODERATOR,
          passwordHash,
          firstName: firstNameArg,
          lastName: lastNameArg,
          isEmailVerified: true,
        },
      });
      console.log(`Updated user ${updated.email} with MODERATOR role.`);
    } else {
      const created = await prisma.user.create({
        data: {
          email,
          passwordHash,
          firstName: firstNameArg,
          lastName: lastNameArg,
          role: Role.MODERATOR,
          isEmailVerified: true,
        },
      });
      console.log(`Created new MODERATOR user ${created.email} (${created.id}).`);
    }
  } finally {
    await prisma.$disconnect();
    await pool.end();
  }
};

run().catch((error: unknown) => {
  console.error('Failed to create moderator:', error);
  process.exit(1);
});
