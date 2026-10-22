import { prisma } from "../src/lib/prisma";
import { EXAMPLE_PATHWAY_BUNDLE } from "../seed/reference/pathways/example";
import { EXTENSIBILITY_FIXTURE } from "../seed/fixtures/extensibility/index";

async function main() {
  console.log("Seeding pathways and regulatory content...");

  if (process.env.NODE_ENV === "production" || process.env.APP_ENV === "production") {
    throw new Error("Refusing to seed placeholder pathways when NODE_ENV=production");
  }

  // 1. Ensure test countries XA and XB exist
  await prisma.country.upsert({
    where: { code: "XA" },
    create: { code: "XA", name: "Testland Origin", canBeOrigin: true },
    update: { canBeOrigin: true },
  });
  await prisma.country.upsert({
    where: { code: "XB" },
    create: { code: "XB", name: "Testland Destination", canBeDestination: true },
    update: { canBeDestination: true },
  });

  // Ensure sector and profession exist for extensibility
  await prisma.sector.upsert({
    where: { slug: EXTENSIBILITY_FIXTURE.sector.slug },
    create: {
      slug: EXTENSIBILITY_FIXTURE.sector.slug,
      labelKey: "sector.fictional",
      sortOrder: EXTENSIBILITY_FIXTURE.sector.sortOrder,
    },
    update: {},
  });

  await prisma.profession.upsert({
    where: { code: EXTENSIBILITY_FIXTURE.profession.slug },
    create: {
      code: EXTENSIBILITY_FIXTURE.profession.slug,
      name: "Fictional Medic",
      sectorId: EXTENSIBILITY_FIXTURE.sector.slug,
      status: "live",
      isActive: true,
      isRegulated: true,
    },
    update: { status: "live", isActive: true },
  });

  // Ensure doctor profession exists and is active
  await prisma.profession.upsert({
    where: { code: "doctor" },
    create: {
      code: "doctor",
      name: "Doctor",
      status: "live",
      isActive: true,
      isRegulated: true,
    },
    update: { status: "live", isActive: true },
  });

  // Ensure profile fields used by criteria exist
  const fields = [
    { key: "qualificationCountry", type: "country", labelKey: "field.qualificationCountry.label", whyAskedKey: "field.qualificationCountry.whyAsked" },
    { key: "medicalSchoolCountry", type: "country", labelKey: "field.medicalSchoolCountry.label", whyAskedKey: "field.medicalSchoolCountry.whyAsked" },
    { key: "yearsOfExperience", type: "number", labelKey: "field.yearsOfExperience.label", whyAskedKey: "field.yearsOfExperience.whyAsked" },
    { key: "internshipStatus", type: "select", labelKey: "field.internshipStatus.label", whyAskedKey: "field.internshipStatus.whyAsked" },
    { key: "hasSpecialtyBoard", type: "boolean", labelKey: "field.hasSpecialtyBoard.label", whyAskedKey: "field.hasSpecialtyBoard.whyAsked" },
  ];

  for (const f of fields) {
    await prisma.profileField.upsert({
      where: { key: f.key },
      create: {
        key: f.key,
        type: f.type,
        labelKey: f.labelKey,
        whyAskedKey: f.whyAskedKey,
        category: "eligibility",
      },
      update: {},
    });
  }

  // 2. Seed Example Doctor Pathway (EXAMPLE)
  const ex = EXAMPLE_PATHWAY_BUNDLE;
  let exSource = await prisma.source.findFirst({
    where: { url: ex.source.url },
  });
  if (!exSource) {
    exSource = await prisma.source.create({
      data: {
        url: ex.source.url,
        title: ex.source.title,
        publisher: ex.source.publisher,
        verifiedAt: new Date(ex.source.verifiedAt),
        status: ex.source.status,
      },
    });
  }

  const exPathway = await prisma.pathway.upsert({
    where: { slug: ex.pathway.slug },
    create: {
      slug: ex.pathway.slug,
      name: ex.pathway.name,
      professionId: ex.pathway.professionId,
      originCountry: ex.pathway.originCountry,
      destinationCountry: ex.pathway.destinationCountry,
      categoryLabelKey: ex.pathway.categoryLabelKey,
      status: "live",
      isActive: true,
    },
    update: {
      name: ex.pathway.name,
      status: "live",
      isActive: true,
    },
  });

  const exVersion = await prisma.pathwayVersion.upsert({
    where: {
      pathwayId_version: {
        pathwayId: exPathway.id,
        version: ex.version.version,
      },
    },
    create: {
      pathwayId: exPathway.id,
      version: ex.version.version,
      status: "published",
      publishedAt: new Date(ex.version.publishedAt),
    },
    update: { status: "published" },
  });

  // Seed criteria
  for (const c of ex.criteria) {
    await prisma.criterion.upsert({
      where: {
        pathwayVersionId_key: {
          pathwayVersionId: exVersion.id,
          key: c.key,
        },
      },
      create: {
        pathwayVersionId: exVersion.id,
        key: c.key,
        profileField: c.profileField,
        operator: c.operator,
        expected: c.expected as unknown as object,
        mandatory: c.mandatory,
        sourceId: exSource.id,
        explanationKey: c.explanationKey,
        verifiedAt: new Date(c.verifiedAt),
        isPlaceholder: true,
      },
      update: {
        expected: c.expected as unknown as object,
        mandatory: c.mandatory,
      },
    });
  }

  // Seed templates
  const templateIdMap = new Map<string, string>();
  for (const t of ex.templates) {
    const tmpl = await prisma.taskTemplate.upsert({
      where: {
        pathwayVersionId_key: {
          pathwayVersionId: exVersion.id,
          key: t.key,
        },
      },
      create: {
        pathwayVersionId: exVersion.id,
        key: t.key,
        category: t.category,
        titleKey: t.titleKey,
        bodyKey: t.bodyKey,
        intakeKey: t.intakeKey,
        intakeGroup: t.intakeGroup,
        intakeOrder: t.intakeOrder,
        askAtIntake: t.askAtIntake,
        isIrreversiblePayment: t.isIrreversiblePayment,
        sourceId: exSource.id,
        isPlaceholder: true,
      },
      update: {
        category: t.category,
        titleKey: t.titleKey,
        bodyKey: t.bodyKey,
        intakeKey: t.intakeKey,
        intakeGroup: t.intakeGroup,
        intakeOrder: t.intakeOrder,
        askAtIntake: t.askAtIntake,
        isIrreversiblePayment: t.isIrreversiblePayment,
      },
    });
    templateIdMap.set(t.id, tmpl.id);
  }

  // Dependencies
  for (const d of ex.dependencies) {
    const fromId = templateIdMap.get(d.taskTemplateId);
    const toId = templateIdMap.get(d.dependsOnId);
    if (fromId && toId) {
      await prisma.taskTemplateDependency.upsert({
        where: {
          taskTemplateId_dependsOnId: {
            taskTemplateId: fromId,
            dependsOnId: toId,
          },
        },
        create: {
          taskTemplateId: fromId,
          dependsOnId: toId,
        },
        update: {},
      });
    }
  }

  console.log(`Seeded Pathway: ${exPathway.name} (${exPathway.slug}) with ${ex.templates.length} tasks and ${ex.criteria.length} criteria.`);

  // 3. Seed Extensibility Pathway
  const ext = EXTENSIBILITY_FIXTURE;
  let extSource = await prisma.source.findFirst({
    where: { url: ext.source.url },
  });
  if (!extSource) {
    extSource = await prisma.source.create({
      data: {
        url: ext.source.url,
        title: ext.source.title,
        publisher: ext.source.publisher,
        verifiedAt: new Date(ext.source.verifiedAt),
        status: ext.source.status,
      },
    });
  }

  const extPathway = await prisma.pathway.upsert({
    where: { slug: ext.pathway.slug },
    create: {
      slug: ext.pathway.slug,
      name: ext.pathway.name,
      professionId: ext.pathway.professionId,
      originCountry: ext.pathway.originCountry,
      destinationCountry: ext.pathway.destinationCountry,
      categoryLabelKey: ext.pathway.categoryLabelKey,
      status: "live",
      isActive: true,
    },
    update: { status: "live", isActive: true },
  });

  const extVersion = await prisma.pathwayVersion.upsert({
    where: {
      pathwayId_version: {
        pathwayId: extPathway.id,
        version: ext.version.version,
      },
    },
    create: {
      pathwayId: extPathway.id,
      version: ext.version.version,
      status: "published",
      publishedAt: new Date(ext.version.publishedAt),
    },
    update: { status: "published" },
  });

  for (const c of ext.criteria) {
    await prisma.criterion.upsert({
      where: {
        pathwayVersionId_key: {
          pathwayVersionId: extVersion.id,
          key: c.key,
        },
      },
      create: {
        pathwayVersionId: extVersion.id,
        key: c.key,
        profileField: c.profileField,
        operator: c.operator,
        expected: c.expected as unknown as object,
        mandatory: c.mandatory,
        sourceId: extSource.id,
        explanationKey: c.explanationKey,
        verifiedAt: new Date(c.verifiedAt),
        isPlaceholder: true,
      },
      update: {},
    });
  }

  const extTemplateMap = new Map<string, string>();
  for (const t of ext.templates) {
    const tmpl = await prisma.taskTemplate.upsert({
      where: {
        pathwayVersionId_key: {
          pathwayVersionId: extVersion.id,
          key: t.key,
        },
      },
      create: {
        pathwayVersionId: extVersion.id,
        key: t.key,
        category: t.category,
        titleKey: t.titleKey,
        bodyKey: t.bodyKey,
        intakeKey: t.intakeKey,
        intakeGroup: t.intakeGroup,
        intakeOrder: t.intakeOrder,
        askAtIntake: t.askAtIntake,
        isIrreversiblePayment: t.isIrreversiblePayment,
        sourceId: extSource.id,
        isPlaceholder: true,
      },
      update: {},
    });
    extTemplateMap.set(t.id, tmpl.id);
  }

  for (const d of ext.dependencies) {
    const fromId = extTemplateMap.get(d.taskTemplateId);
    const toId = extTemplateMap.get(d.dependsOnId);
    if (fromId && toId) {
      await prisma.taskTemplateDependency.upsert({
        where: {
          taskTemplateId_dependsOnId: {
            taskTemplateId: fromId,
            dependsOnId: toId,
          },
        },
        create: {
          taskTemplateId: fromId,
          dependsOnId: toId,
        },
        update: {},
      });
    }
  }

  console.log(`Seeded Extensibility Pathway: ${extPathway.name} (${extPathway.slug}).`);
}

main()
  .catch((e) => {
    console.error("Seeding failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
