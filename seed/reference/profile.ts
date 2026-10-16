import type { SeedBundle } from "@/modules/seed/bundle";

/**
 * PLACEHOLDER profile content. The field list below follows the PRD's "about 10 fields"
 * guidance and must be confirmed by the content team before launch. Option lists are
 * neutral vocabularies, not regulatory facts. Each field states its purpose in
 * `purposeNote`. No registration or licence fields are seeded.
 */

const opt = (value: string, en: string) => ({ value, label: { en } });

const profile: Pick<SeedBundle, "lists" | "fields" | "stepTitles" | "schemas"> = {
  lists: [
    {
      // PLACEHOLDER broad list; content team to confirm.
      key: "medical-specialties",
      items: [
        opt("anaesthesia", "Anaesthesia"),
        opt("emergency-medicine", "Emergency medicine"),
        opt("family-medicine", "Family medicine"),
        opt("internal-medicine", "Internal medicine"),
        opt("obstetrics-gynaecology", "Obstetrics and gynaecology"),
        opt("ophthalmology", "Ophthalmology"),
        opt("orthopaedics", "Orthopaedics"),
        opt("paediatrics", "Paediatrics"),
        opt("pathology", "Pathology"),
        opt("psychiatry", "Psychiatry"),
        opt("radiology", "Radiology"),
        opt("surgery", "Surgery"),
        opt("other", "Other"),
      ],
    },
  ],

  fields: [
    {
      key: "trainedInCountry",
      type: "country",
      label: { en: "Country where you trained" },
      whyAsked: { en: "We use this to show information that fits where you trained." },
      options: { source: "countries", role: "origin" },
      // Virtual: reads and writes UserCountry (role trained_in). Never stored twice.
      storage: { kind: "user_country", role: "trained_in" },
      category: "eligibility",
      purposeNote: "Country of training; drives which content applies (PRD: must be data from day one).",
    },
    {
      key: "currentCountry",
      type: "country",
      label: { en: "Country where you work now" },
      whyAsked: { en: "This helps us tailor next steps. It is optional." },
      options: { source: "countries", role: "any" },
      // Virtual: reads and writes UserCountry (role practising_in).
      storage: { kind: "user_country", role: "practising_in" },
      category: "career",
      purposeNote: "Where the user practises now; optional context for planning.",
    },
    {
      key: "graduationYear",
      type: "number",
      label: { en: "Year you graduated" },
      whyAsked: { en: "Some requirements depend on how recently you qualified." },
      validation: { integer: true, min: 1950, max: 2100 },
      category: "eligibility",
      purposeNote: "Qualification timing for eligibility checks.",
    },
    {
      key: "highestQualification",
      type: "select",
      label: { en: "Highest qualification" },
      whyAsked: { en: "We use this to match you to the right pathway information." },
      options: {
        source: "inline",
        items: [
          opt("primary_degree", "Primary professional degree"),
          opt("postgraduate_diploma", "Postgraduate diploma"),
          opt("masters", "Master's degree"),
          opt("doctorate", "Doctorate"),
          opt("other", "Other"),
        ],
      },
      category: "eligibility",
      purposeNote: "Shared across professions; options are placeholders.",
    },
    {
      key: "careerStage",
      type: "select",
      label: { en: "Where are you in your career?" },
      whyAsked: { en: "Your stage changes which steps are relevant to you." },
      // Career-stage vocabulary lives here as options, never in code.
      options: {
        source: "inline",
        items: [
          opt("house_officer", "House officer"),
          opt("medical_officer", "Medical officer"),
          opt("registrar", "Registrar"),
          opt("consultant", "Consultant"),
          opt("other", "Other"),
        ],
      },
      category: "career",
      purposeNote: "Career stage vocabulary for the doctor / Nigeria schema; content team to confirm.",
    },
    {
      key: "yearsOfExperience",
      type: "number",
      label: { en: "Years of experience" },
      whyAsked: { en: "Experience can affect which options are open to you." },
      validation: { integer: true, min: 0, max: 60 },
      category: "career",
      purposeNote: "Shared across professions.",
    },
    {
      key: "internshipStatus",
      type: "select",
      label: { en: "Internship (house officer year) status" },
      whyAsked: { en: "Whether you have finished this affects your next steps." },
      options: {
        source: "inline",
        items: [
          opt("not_started", "Not started"),
          opt("in_progress", "In progress"),
          opt("completed", "Completed"),
          opt("not_applicable", "Not applicable"),
          opt("unknown", "I am not sure"),
        ],
      },
      category: "eligibility",
      purposeNote: "Doctor / Nigeria specific. Options migrated from the legacy internship_status values.",
    },
    {
      key: "specialty",
      type: "select",
      label: { en: "Specialty (optional)" },
      whyAsked: { en: "Specialty can change which guidance is useful. You can skip this." },
      // Options come from the reference list, not from code.
      options: { source: "list", listKey: "medical-specialties" },
      category: "career",
      purposeNote: "Optional. Options come from the medical-specialties reference list.",
    },
    {
      key: "languageTestStatus",
      type: "select",
      label: { en: "Language test status" },
      whyAsked: { en: "Some destinations ask for a language test. This shows where you stand." },
      // Options live inside the field, never in an enum.
      options: {
        source: "inline",
        items: [
          opt("unknown", "I am not sure"),
          opt("not_required", "Not required for me"),
          opt("not_started", "Not started"),
          opt("booked", "Booked"),
          opt("passed", "Passed"),
          opt("expired", "Expired"),
          opt("exempt", "Exempt"),
        ],
      },
      category: "immigration",
      purposeNote: "Migrated from the legacy language_test_status values; content team to confirm.",
    },
    {
      key: "timeline",
      type: "select",
      label: { en: "When do you hope to move?" },
      whyAsked: { en: "We use this to pace your plan. There is no wrong answer." },
      options: {
        source: "inline",
        items: [
          opt("within_6_months", "Within 6 months"),
          opt("6_12_months", "6 to 12 months"),
          opt("1_2_years", "1 to 2 years"),
          opt("exploring", "Just exploring"),
          opt("unknown", "I am not sure"),
        ],
      },
      category: "general",
      purposeNote: "Planning horizon; shared across professions.",
    },
  ],

  stepTitles: {
    background: { en: "Your background" },
    training: { en: "About your training" },
    career: { en: "Your career so far" },
    plans: { en: "Your plans" },
  },

  schemas: [
    {
      // Default: applies to any profession without a more specific schema.
      profession: null,
      version: 1,
      steps: [
        {
          key: "background",
          fields: [
            { key: "trainedInCountry", required: true },
            { key: "highestQualification" },
            { key: "yearsOfExperience" },
          ],
        },
        { key: "plans", fields: [{ key: "timeline" }] },
      ],
    },
    {
      // PLACEHOLDER: doctor trained in Nigeria. Field list to be confirmed by content team.
      profession: "doctor",
      origin: "NG",
      version: 1,
      steps: [
        {
          key: "training",
          fields: [
            { key: "trainedInCountry", required: true },
            { key: "graduationYear", required: true },
            { key: "highestQualification", required: true },
            { key: "internshipStatus", required: true },
          ],
        },
        {
          key: "career",
          fields: [
            { key: "careerStage", required: true },
            { key: "yearsOfExperience", required: true },
            { key: "specialty" },
            { key: "currentCountry" },
          ],
        },
        { key: "plans", fields: [{ key: "languageTestStatus" }, { key: "timeline" }] },
      ],
    },
  ],
};

export default profile;
