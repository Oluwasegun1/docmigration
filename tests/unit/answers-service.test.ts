import { describe, expect, it, vi } from "vitest";
import { createProfileAnswersService } from "@/modules/profile/answers-service";

describe("ProfileAnswersService.saveAnswers", () => {
  it("guards against foreign key violations by filtering out non-schema keys and virtual storage", async () => {
    const upsertProfileAnswer = vi.fn().mockResolvedValue({});
    const upsertUserCountry = vi.fn().mockResolvedValue({});
    const upsertUserProfession = vi.fn().mockResolvedValue({});

    const mockDb = {
      profileField: {
        findMany: vi.fn().mockResolvedValue([
          { key: "graduationYear", storage: "answer" },
          { key: "highestQualification", storage: "answer" },
          { key: "trainedInCountry", storage: "user_country" },
        ]),
      },
      userCountry: {
        upsert: upsertUserCountry,
      },
      userProfession: {
        upsert: upsertUserProfession,
      },
      profileAnswer: {
        upsert: upsertProfileAnswer,
      },
    } as any;

    const mockAudit = { record: vi.fn().mockResolvedValue(undefined) } as any;

    const service = createProfileAnswersService(mockDb, mockAudit);

    await service.saveAnswers("user-123", {
      graduationYear: 2020,
      highestQualification: "primary_degree",
      trainedInCountry: "NG",
      originCountry: "NG", // Non-field: must NOT be upserted to profileAnswer
      profession: "doctor", // Non-field: must NOT be upserted to profileAnswer
      unknownKey: "value", // Non-field: must NOT be upserted to profileAnswer
    });

    // Virtual storage should be upserted to userCountry
    expect(upsertUserCountry).toHaveBeenCalledWith(
      expect.objectContaining({
        create: expect.objectContaining({ role: "trained_in", countryCode: "NG" }),
      })
    );

    // Profession should be upserted to userProfession
    expect(upsertUserProfession).toHaveBeenCalledWith(
      expect.objectContaining({
        create: expect.objectContaining({ professionCode: "doctor" }),
      })
    );

    // ProfileAnswer must ONLY be called for valid fields with storage == 'answer'
    expect(upsertProfileAnswer).toHaveBeenCalledTimes(2);
    expect(upsertProfileAnswer).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { userId_fieldKey: { userId: "user-123", fieldKey: "graduationYear" } },
      })
    );
    expect(upsertProfileAnswer).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { userId_fieldKey: { userId: "user-123", fieldKey: "highestQualification" } },
      })
    );

    // Must NOT have attempted upsert for originCountry, profession, or trainedInCountry in profileAnswer
    const calledFieldKeys = upsertProfileAnswer.mock.calls.map(
      (call: any) => call[0].where.userId_fieldKey.fieldKey
    );
    expect(calledFieldKeys).not.toContain("originCountry");
    expect(calledFieldKeys).not.toContain("profession");
    expect(calledFieldKeys).not.toContain("trainedInCountry");
    expect(calledFieldKeys).not.toContain("unknownKey");
  });
});
