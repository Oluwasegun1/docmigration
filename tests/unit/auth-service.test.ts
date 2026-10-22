import { describe, expect, it } from "vitest";
import { hashPassword, validatePasswordStrength, verifyPassword } from "@/modules/auth/password";
import { ConsoleDevMailer } from "@/modules/auth/mailer";
import { createAuthService, maskEmail } from "@/modules/auth/service";

describe("maskEmail", () => {
  it("masks username correctly while preserving domain", () => {
    expect(maskEmail("alex@example.com")).toBe("a•••@example.com");
    expect(maskEmail("doctor.nigeria@domain.org")).toBe("d•••@domain.org");
  });
});

describe("Password Security & Breached Passwords", () => {
  it("rejects passwords shorter than 10 characters", () => {
    expect(() => validatePasswordStrength("short")).toThrow(/at least 10 characters/);
  });

  it("rejects passwords longer than 64 characters", () => {
    const longPw = "a".repeat(65);
    expect(() => validatePasswordStrength(longPw)).toThrow(/not exceed 64 characters/);
  });

  it("rejects breached or easily guessed passwords using local list", () => {
    expect(() => validatePasswordStrength("password12345")).toThrow(/too common or easily guessed/);
    expect(() => validatePasswordStrength("12345678901")).toThrow(/too common or easily guessed/);
  });

  it("hashes and correctly verifies passwords with salt", async () => {
    const pw = "secure-unique-passphrase-2026!";
    const hash = await hashPassword(pw);

    expect(hash).toContain(":");
    expect(await verifyPassword(pw, hash)).toBe(true);
    expect(await verifyPassword("wrong-passphrase-here!", hash)).toBe(false);
  });
});

describe("AuthService Enumeration Protection & Flow", () => {
  function createMockDb() {
    const users: any[] = [];
    const accounts: any[] = [];
    const verifications: any[] = [];
    const sessions: any[] = [];
    const consents: any[] = [];
    const signupDrafts: any[] = [];

    const db: any = {
      user: {
        findUnique: async ({ where }: any) => users.find((u) => u.email === where.email || u.id === where.id),
        create: async ({ data }: any) => {
          const u = { id: `user-${users.length + 1}`, ...data };
          users.push(u);
          return u;
        },
        update: async ({ where, data }: any) => {
          const u = users.find((x) => x.id === where.id);
          Object.assign(u, data);
          return u;
        },
      },
      account: {
        create: async ({ data }: any) => {
          accounts.push(data);
          return data;
        },
        updateMany: async ({ where, data }: any) => {
          const matched = accounts.filter((a) => a.userId === where.userId);
          matched.forEach((a) => Object.assign(a, data));
          return { count: matched.length };
        },
      },
      verification: {
        create: async ({ data }: any) => {
          const v = { id: `ver-${verifications.length + 1}`, usedAt: null, ...data };
          verifications.push(v);
          return v;
        },
        findFirst: async ({ where }: any) => {
          return verifications.find(
            (v) =>
              v.value === where.value &&
              v.purpose === where.purpose &&
              (v.usedAt === null || v.usedAt === undefined) &&
              v.expiresAt > new Date()
          );
        },
        update: async ({ where, data }: any) => {
          const v = verifications.find((x) => x.id === where.id);
          Object.assign(v, data);
          return v;
        },
        updateMany: async ({ where, data }: any) => {
          const matched = verifications.filter((v) => v.identifier === where.identifier && v.purpose === where.purpose);
          matched.forEach((v) => Object.assign(v, data));
          return { count: matched.length };
        },
      },
      session: {
        create: async ({ data }: any) => {
          sessions.push(data);
          return data;
        },
        findUnique: async ({ where }: any) => {
          const s = sessions.find((x) => x.token === where.token);
          if (!s) return null;
          const u = users.find((x) => x.id === s.userId);
          return { ...s, userRel: u };
        },
        deleteMany: async ({ where }: any) => {
          const before = sessions.length;
          if (where.token) {
            const idx = sessions.findIndex((s) => s.token === where.token);
            if (idx >= 0) sessions.splice(idx, 1);
          } else if (where.userId) {
            for (let i = sessions.length - 1; i >= 0; i--) {
              if (sessions[i].userId === where.userId) sessions.splice(i, 1);
            }
          }
          return { count: before - sessions.length };
        },
      },
      consent: {
        create: async ({ data }: any) => {
          consents.push(data);
          return data;
        },
      },
      signupDraft: {
        create: async ({ data }: any) => {
          signupDrafts.push(data);
          return data;
        },
        findUnique: async ({ where }: any) => signupDrafts.find((d) => d.userId === where.userId),
      },
      $transaction: async (fn: any) => fn(db),
    };

    return { db, users, accounts, verifications, sessions, consents, signupDrafts };
  }

  it("registers a new user and sends verification email WITHOUT starting a session", async () => {
    const { db, sessions, verifications } = createMockDb();
    const mailer = new ConsoleDevMailer();
    const audit = { record: async () => {} };
    const auth = createAuthService(db, mailer, audit);

    const res = await auth.register({
      name: "Test Doctor",
      email: "doctor@example.com",
      password: "secure-sentence-phrase-1234",
      termsAccepted: true,
    });

    expect(res.ok).toBe(true);
    expect(res.maskedEmail).toBe("d•••@example.com");

    // Must NOT start session automatically
    expect(sessions.length).toBe(0);

    // Creates hashed verification token and email sent
    expect(verifications.length).toBe(1);
    expect(mailer.getSentMessages().length).toBe(1);
    expect(mailer.getSentMessages()[0].to).toBe("doctor@example.com");
  });

  it("returns identical response for duplicate registration without error (enumeration protection)", async () => {
    const { db, mailer } = (() => {
      const mock = createMockDb();
      const m = new ConsoleDevMailer();
      return { ...mock, mailer: m };
    })();
    const audit = { record: async () => {} };
    const auth = createAuthService(db, mailer, audit);

    // First registration
    await auth.register({
      name: "First",
      email: "existing@example.com",
      password: "secure-sentence-phrase-1234",
      termsAccepted: true,
    });

    // Duplicate registration attempt
    const res = await auth.register({
      name: "Second",
      email: "existing@example.com",
      password: "another-secure-phrase-9876",
      termsAccepted: true,
    });

    expect(res.ok).toBe(true);
    expect(res.maskedEmail).toBe("e•••@example.com");

    // Second email is "You already have an account" notification
    const messages = mailer.getSentMessages();
    expect(messages.length).toBe(2);
    expect(messages[1].subject).toContain("already have");
  });

  it("revokes all existing sessions when password is reset", async () => {
    const { db, users, accounts, sessions, verifications } = createMockDb();
    const mailer = new ConsoleDevMailer();
    const audit = { record: async () => {} };
    const auth = createAuthService(db, mailer, audit);

    // Register user
    await auth.register({
      name: "Session Test",
      email: "user@example.com",
      password: "initial-secure-password-123",
      termsAccepted: true,
    });

    // Add active sessions
    sessions.push({ userId: users[0].id, token: "session-1", expiresAt: new Date(Date.now() + 10000) });
    sessions.push({ userId: users[0].id, token: "session-2", expiresAt: new Date(Date.now() + 10000) });
    expect(sessions.length).toBe(2);

    // Request forgot password
    await auth.forgotPassword("user@example.com");
    const resetVerification = verifications.find((v) => v.purpose === "password_reset");
    expect(resetVerification).toBeDefined();

    // Find the raw token from the mailer
    const lastMsg = mailer.getSentMessages().slice(-1)[0];
    const match = lastMsg.text.match(/token=([a-f0-9]+)/);
    const rawToken = match![1];

    // Reset password
    await auth.resetPassword(rawToken, "new-secure-password-phrase-456");

    // All active sessions must be revoked!
    expect(sessions.length).toBe(0);
  });
});
