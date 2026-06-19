import { query } from "../../config/db";
import { AnimalStatus, CaseType, EducationAudience, EducationModule } from "../../types/global.types";

interface LegalSection {
  title: string;
  summary: string;
  actions: string[];
}

interface LegalContent {
  updatedAt: string;
  sections: LegalSection[];
  modules: EducationModule[];
}

interface EducationRow {
  id: string;
  topic_key: string;
  title: string;
  audience: EducationAudience;
  summary: string;
  action_points: string[] | null;
  trigger_case_type: CaseType | null;
  trigger_animal_status: AnimalStatus | null;
  language_code: string;
  created_at: Date;
}

const mapEducation = (row: EducationRow): EducationModule => ({
  id: row.id,
  topicKey: row.topic_key,
  title: row.title,
  audience: row.audience,
  summary: row.summary,
  actionPoints: row.action_points ?? [],
  triggerCaseType: row.trigger_case_type,
  triggerAnimalStatus: row.trigger_animal_status,
  languageCode: row.language_code,
  createdAt: row.created_at
});

const fallbackSections: LegalSection[] = [
  {
    title: "Cruelty and abuse response",
    summary:
      "Document visible harm, preserve evidence, and escalate to local police, the animal husbandry department, or a registered welfare NGO.",
    actions: [
      "Record photos, videos, and eyewitness statements with timestamps.",
      "Avoid confrontation if the situation is unsafe and prioritize immediate safety.",
      "Reference local cruelty provisions and municipal animal welfare rules when escalating."
    ]
  },
  {
    title: "Street dog management",
    summary:
      "Community animals should be managed through vaccination, sterilization, feeding discipline, and conflict mitigation instead of forced relocation.",
    actions: [
      "Coordinate ABC scheduling through approved municipal or NGO partners.",
      "Maintain predictable feeding points away from traffic and school gates.",
      "Track aggressive incidents separately to support targeted intervention."
    ]
  },
  {
    title: "Lost pet and ownership proof",
    summary:
      "Maintain recent photos, collar details, microchip tags where available, and neighborhood sighting logs to support recovery.",
    actions: [
      "Publish the last known location, distinguishing marks, and contact phone.",
      "Cross-check nearby shelters, clinics, and resident groups within the first 24 hours.",
      "Log every verified sighting with time and GPS coordinates."
    ]
  }
];

class LegalService {
  async getEducationModules(filters: {
    audience?: EducationAudience;
    caseType?: CaseType | null;
    animalStatus?: AnimalStatus | null;
  }): Promise<EducationModule[]> {
    const conditions: string[] = ["1 = 1"];
    const values: Array<string | null> = [];

    if (filters.audience) {
      values.push(filters.audience);
      conditions.push(`(ec.audience = $${values.length} OR ec.audience = 'community')`);
    }

    if (filters.caseType) {
      values.push(filters.caseType);
      conditions.push(`(ec.trigger_case_type IS NULL OR ec.trigger_case_type = $${values.length})`);
    }

    if (filters.animalStatus) {
      values.push(filters.animalStatus);
      conditions.push(`(ec.trigger_animal_status IS NULL OR ec.trigger_animal_status = $${values.length})`);
    }

    const result = await query<EducationRow>(
      `
        SELECT
          ec.id,
          ec.topic_key,
          ec.title,
          ec.audience,
          ec.summary,
          ec.action_points,
          ec.trigger_case_type,
          ec.trigger_animal_status,
          ec.language_code,
          ec.created_at
        FROM education_content ec
        WHERE ${conditions.join(" AND ")}
        ORDER BY ec.created_at DESC, ec.title ASC
      `,
      values
    );

    return result.rows.map(mapEducation);
  }

  async getContent(filters: {
    audience?: EducationAudience;
    caseType?: CaseType | null;
    animalStatus?: AnimalStatus | null;
  } = {}): Promise<LegalContent> {
    const modules = await this.getEducationModules(filters);

    return {
      updatedAt: new Date().toISOString(),
      sections: fallbackSections,
      modules
    };
  }
}

export const legalService = new LegalService();
