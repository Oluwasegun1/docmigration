import { describe, expect, it } from "vitest";
import {
  type CountryRow,
  type LabelRow,
  type OfferingRow,
  type ProfessionRow,
  type ReferenceRepository,
  type SectorRow,
} from "@/modules/reference/repository";
import { createReferenceService } from "@/modules/reference/service";

function createInMemoryReferenceRepo(data: {
  sectors?: SectorRow[];
  professions?: ProfessionRow[];
  countries?: CountryRow[];
  offerings?: OfferingRow[];
  labels?: LabelRow[];
}): ReferenceRepository {
  return {
    listSectors: async () => data.sectors ?? [],
    listProfessions: async () => data.professions ?? [],
    listCountries: async () => data.countries ?? [],
    listOfferings: async () => data.offerings ?? [],
    getLabels: async (keys, locales) =>
      (data.labels ?? []).filter((l) => keys.includes(l.key) && locales.includes(l.locale)),
  };
}

describe("ReferenceService", () => {
  const repo = createInMemoryReferenceRepo({
    sectors: [{ slug: "healthcare", labelKey: "sector.healthcare", sortOrder: 1 }],
    professions: [
      {
        code: "doctor",
        name: "Doctor",
        sectorId: "healthcare",
        labelKey: "profession.doctor",
        labelPluralKey: "profession.doctor.plural",
        status: "live",
        isRegulated: true,
        sortOrder: 1,
      },
      {
        code: "nurse",
        name: "Nurse",
        sectorId: "healthcare",
        labelKey: "profession.nurse",
        labelPluralKey: "profession.nurse.plural",
        status: "hidden", // must never be returned in public API
        isRegulated: true,
        sortOrder: 2,
      },
      {
        code: "engineer",
        name: "Engineer",
        sectorId: "healthcare",
        labelKey: "profession.engineer",
        labelPluralKey: "profession.engineer.plural",
        status: "waitlist", // visible, but canOnboard = false
        isRegulated: false,
        sortOrder: 3,
      },
    ],
    countries: [
      {
        code: "NG",
        name: "Nigeria",
        nameKey: "country.NG",
        callingCode: "+234",
        canBeOrigin: true,
        canBeDestination: false,
      },
      {
        code: "GB",
        name: "United Kingdom",
        nameKey: "country.GB",
        callingCode: "+44",
        canBeOrigin: false,
        canBeDestination: true,
      },
      {
        code: "CA",
        name: "Canada",
        nameKey: "country.CA",
        callingCode: "+1",
        canBeOrigin: false,
        canBeDestination: true,
      },
    ],
    offerings: [
      { professionCode: "doctor", originCountry: "NG", destinationCountry: "GB", status: "beta" },
      { professionCode: "doctor", originCountry: "NG", destinationCountry: "CA", status: "hidden" },
      { professionCode: "nurse", originCountry: "NG", destinationCountry: "GB", status: "live" },
    ],
    labels: [
      { key: "sector.healthcare", locale: "en", text: "Healthcare" },
      { key: "profession.doctor", locale: "en", text: "Doctor" },
      { key: "profession.doctor.plural", locale: "en", text: "Doctors" },
      { key: "profession.engineer", locale: "en", text: "Engineer" },
      { key: "profession.engineer.plural", locale: "en", text: "Engineers" },
      { key: "country.NG", locale: "en", text: "Nigeria" },
      { key: "country.GB", locale: "en", text: "United Kingdom" },
      { key: "country.CA", locale: "en", text: "Canada" },
    ],
  });

  const service = createReferenceService(repo);

  it("never includes hidden professions in listProfessions", async () => {
    const list = await service.listProfessions({ locale: "en" });
    const slugs = list.map((p) => p.slug);
    expect(slugs).toContain("doctor");
    expect(slugs).toContain("engineer");
    expect(slugs).not.toContain("nurse"); // hidden
  });

  it("marks waitlist professions with canOnboard = false", async () => {
    const list = await service.listProfessions({ locale: "en" });
    const doc = list.find((p) => p.slug === "doctor")!;
    const eng = list.find((p) => p.slug === "engineer")!;

    expect(doc.canOnboard).toBe(true);
    expect(eng.canOnboard).toBe(false);
  });

  it("throws not_found when looking up a hidden profession", async () => {
    await expect(service.requireVisibleProfession("nurse")).rejects.toThrow();
  });

  it("filters offerings to live/beta and open professions only", async () => {
    const offerings = await service.listOfferings();
    expect(offerings).toEqual([
      { profession: "doctor", origin: "NG", destination: "GB", status: "beta" },
    ]);
  });

  it("lists origin countries supported for doctor", async () => {
    const origins = await service.listCountries({
      role: "origin",
      profession: "doctor",
      locale: "en",
    });
    expect(origins.map((c) => c.code)).toEqual(["NG"]);
    expect(origins[0].supported).toBe(true);
  });

  it("lists destination countries supported for doctor from NG", async () => {
    const dests = await service.listCountries({
      role: "destination",
      profession: "doctor",
      origin: "NG",
      locale: "en",
    });
    // CA is hidden in offerings, so only GB should be returned
    expect(dests.map((c) => c.code)).toEqual(["GB"]);
  });

  it("returns all destination countries with scope=all", async () => {
    const dests = await service.listCountries({
      role: "destination",
      profession: "doctor",
      origin: "NG",
      scope: "all",
      locale: "en",
    });
    const gb = dests.find((c) => c.code === "GB")!;
    const ca = dests.find((c) => c.code === "CA")!;

    expect(gb.supported).toBe(true);
    expect(ca.supported).toBe(false);
  });
});
