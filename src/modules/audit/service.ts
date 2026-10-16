import type { Prisma } from "@prisma/client";

/**
 * Append-only audit trail. `actorRef` is deliberately non-identifying: use a system tag
 * ("system:seed") or an opaque id/hash, never an email or name. `metadata` must also be
 * free of personal data, passwords and tokens.
 */
export type AuditInput = {
  action: string;
  entityType?: string;
  entityKey?: string;
  actorRef: string;
  metadata?: Record<string, unknown>;
};

export interface AuditSink {
  record(events: AuditInput[]): Promise<void>;
}

type AuditDb = { auditEvent: Pick<Prisma.TransactionClient["auditEvent"], "createMany"> };

export function createPrismaAuditSink(db: AuditDb): AuditSink {
  return {
    async record(events) {
      if (events.length === 0) return;
      await db.auditEvent.createMany({
        data: events.map((e) => ({
          action: e.action,
          entityType: e.entityType ?? null,
          entityKey: e.entityKey ?? null,
          actorRef: e.actorRef,
          metadata: (e.metadata ?? undefined) as Prisma.InputJsonValue | undefined,
        })),
      });
    },
  };
}
