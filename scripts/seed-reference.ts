/**
 * Idempotent reference-data seeder:  pnpm seed:reference [--dry-run] [--with <dir>]...
 *
 * Applies seed/reference, then each `--with` bundle directory (e.g. a test fixture), each in
 * its own transaction. Logs what changed and records an AuditEvent per change. Uses
 * DIRECT_URL when set (session pooler / direct) because it runs a long transaction.
 */
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { PrismaClient } from "@prisma/client";
import { createPrismaAuditSink } from "../src/modules/audit/service";
import type { SeedBundle } from "../src/modules/seed/bundle";
import { createPrismaSeedStore } from "../src/modules/seed/prisma-store";
import { applyBundle, summarize } from "../src/modules/seed/runner";
import { SeedValidationError } from "../src/modules/seed/validate";

function parseArgs(argv: string[]) {
  const withDirs: string[] = [];
  let dryRun = false;
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === "--dry-run") dryRun = true;
    else if (argv[i] === "--with" && argv[i + 1]) withDirs.push(argv[++i]);
    else throw new Error(`Unknown argument: ${argv[i]}`);
  }
  return { withDirs, dryRun };
}

async function loadBundle(dir: string): Promise<SeedBundle> {
  const mod = await import(pathToFileURL(resolve(dir, "index.ts")).href);
  return (mod.default ?? mod) as SeedBundle;
}

async function main() {
  const { withDirs, dryRun } = parseArgs(process.argv.slice(2));

  const isProduction =
    process.env.APP_ENV === "production" || process.env.NODE_ENV === "production";

  if (isProduction && withDirs.some((d) => d.includes("fixtures"))) {
    throw new Error(
      "Refusing to apply test fixtures when APP_ENV=production or NODE_ENV=production.",
    );
  }

  const url = process.env.DIRECT_URL || process.env.DATABASE_URL;
  if (!url) throw new Error("DIRECT_URL or DATABASE_URL must be set.");
  const prisma = new PrismaClient({ datasourceUrl: url });

  try {
    for (const dir of ["seed/reference", ...withDirs]) {
      const bundle = await loadBundle(dir);
      if (isProduction && (bundle as { isPlaceholder?: boolean }).isPlaceholder) {
        throw new Error(
          `Refusing to load placeholder bundle "${bundle.id}" when in production.`,
        );
      }
      const result = await prisma.$transaction(
        (tx) =>
          applyBundle(bundle, {
            store: createPrismaSeedStore(tx),
            audit: createPrismaAuditSink(tx),
            actorRef: "system:seed",
            dryRun,
          }),
        { timeout: 120_000, maxWait: 15_000 },
      );
      console.log(summarize(result));
      for (const c of result.changes.filter((c) => c.entity !== "label" && c.entity !== "country")) {
        console.log(`  ${c.kind === "created" ? "+" : "~"} ${c.entity} ${c.key}`);
      }
    }
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((err) => {
  if (err instanceof SeedValidationError) console.error(err.message);
  else console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
