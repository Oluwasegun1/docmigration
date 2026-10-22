import { prisma } from "../src/lib/prisma";
import { createPrismaAuditSink } from "../src/modules/audit/service";
import { createAccountService } from "../src/modules/account/service";

async function main() {
  console.log("Starting data retention purge job...");
  const audit = createPrismaAuditSink(prisma);
  const accountService = createAccountService(prisma, audit);

  const result = await accountService.purgeExpiredAccounts();
  console.log(`Retention job completed. Purged ${result.purgedCount} expired account(s).`);
}

main()
  .catch((err) => {
    console.error("Retention job failed:", err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
