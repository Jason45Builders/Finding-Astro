import { query } from "../../config/db";
import { AppError } from "../../middleware/error.middleware";
import {
  AuthenticatedUser,
  CaseRecord,
  FundingCaseRecord,
  FundingTransactionRecord,
  ReimbursementRequestRecord,
  UserRole,
} from "../../types/global.types";
import { caseRepository } from "../cases/case.repository";

export interface AdminResponder {
  id: string;
  fullName: string | null;
  phone: string;
  role: UserRole;
  tier: number;
  reputation: number;
  currentLatitude: number | null;
  currentLongitude: number | null;
  activeCaseCount: number;
  totalCasesCompleted: number;
  isAvailable: boolean;
  updatedAt: Date;
}

export interface AdminFundingCase {
  id: string;
  caseId: string | null;
  fundingType: string;
  totalAmount: number;
  raisedAmount: number;
  status: string;
  createdAt: string;
  updatedAt: string;
  hospitalName?: string | null;
  verifierName?: string | null;
}

export interface AdminReimbursement {
  id: string;
  fundingCaseId: string;
  requesterUserId: string;
  requesterName: string | null;
  amount: number;
  status: string;
  hospitalVerified: boolean;
  documents: string[];
  createdAt: string;
  updatedAt: string;
}

export interface AdminPartner {
  id: string;
  name: string;
  type: "clinic" | "store" | "ngo" | "helpline" | "abc_centre" | "wildlife_centre";
  phone: string | null;
  email: string | null;
  address: string | null;
  latitude: number | null;
  longitude: number | null;
  verificationStatus: "pending" | "approved" | "rejected";
  verifiedByUserId: string | null;
  services: string[];
  createdAt: string;
  updatedAt: string;
}

export interface AdminWardSummary {
  wardNumber: string;
  wardName: string;
  animalCount: number;
  abcCoveragePercent: number;
  vaccinationRatePercent: number;
  openCases: number;
  avgResponseHours: number | null;
}

export interface AdminEducationContent {
  id: string;
  topicKey: string;
  title: string;
  audience: string;
  summary: string;
  actionPoints: string[];
  triggerCaseType: string | null;
  triggerAnimalStatus: string | null;
  languageCode: string;
  createdAt: string;
  updatedAt: string;
}

export interface AdminBehaviourGuidance {
  id: string;
  situationType: string;
  title: string;
  body: string;
  doItems: string[];
  dontItems: string[];
  audience: string | null;
  category: string;
  published: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface AdminHelpline {
  id: string;
  name: string;
  number: string;
  area: string | null;
  availableHours: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface AdminAlert {
  id: string;
  title: string;
  body: string;
  severity: "info" | "warning" | "critical";
  createdAt: string;
  read: boolean;
}

export interface AdminMonthlyCase {
  month: string;
  resolved: number;
  opened: number;
}

const mapResponder = (row: {
  id: string; full_name: string | null; phone: string; role: UserRole; identity_tier: number;
  reputation_score: string | number; latitude: number | null; longitude: number | null;
  active_case_count: string | number; completed_case_count: string | number; is_available: boolean; updated_at: Date;
}): AdminResponder => ({
  id: row.id,
  fullName: row.full_name,
  phone: row.phone,
  role: row.role,
  tier: row.identity_tier,
  reputation: Number(row.reputation_score),
  currentLatitude: row.latitude === null ? null : Number(row.latitude),
  currentLongitude: row.longitude === null ? null : Number(row.longitude),
  activeCaseCount: Number(row.active_case_count),
  totalCasesCompleted: Number(row.completed_case_count),
  isAvailable: row.is_available,
  updatedAt: row.updated_at,
});

const mapFundingCase = (row: {
  id: string; case_id: string | null; type: string; total_amount: string | number; amount_raised: string | number;
  status: string; created_at: Date; updated_at: Date; hospital_name: string | null; verifier_name: string | null;
}): AdminFundingCase => ({
  id: row.id,
  caseId: row.case_id,
  fundingType: row.type,
  totalAmount: Number(row.total_amount),
  raisedAmount: Number(row.amount_raised),
  status: row.status,
  createdAt: row.created_at.toISOString(),
  updatedAt: row.updated_at.toISOString(),
  hospitalName: row.hospital_name,
  verifierName: row.verifier_name,
});

const mapReimbursement = (row: {
  id: string; case_id: string; volunteer_id: string; requester_name: string | null; amount_claimed: string | number;
  status: string; hospital_verified: boolean; bill_url: string; prescription_url: string; created_at: Date; updated_at: Date;
}): AdminReimbursement => ({
  id: row.id,
  fundingCaseId: row.case_id,
  requesterUserId: row.volunteer_id,
  requesterName: row.requester_name,
  amount: Number(row.amount_claimed),
  status: row.status,
  hospitalVerified: row.hospital_verified,
  documents: [row.bill_url, row.prescription_url].filter(Boolean),
  createdAt: row.created_at.toISOString(),
  updatedAt: row.updated_at.toISOString(),
});

const mapPartner = (row: {
  id: string; name: string; type: AdminPartner["type"]; phone: string | null; email: string | null;
  address: string | null; latitude: string | number | null; longitude: string | number | null;
  is_verified: boolean; services: string[]; created_at: Date; updated_at: Date;
}): AdminPartner => ({
  id: row.id,
  name: row.name,
  type: row.type,
  phone: row.phone,
  email: row.email,
  address: row.address,
  latitude: row.latitude === null ? null : Number(row.latitude),
  longitude: row.longitude === null ? null : Number(row.longitude),
  verificationStatus: row.is_verified ? "approved" : "pending",
  verifiedByUserId: null,
  services: row.services ?? [],
  createdAt: row.created_at.toISOString(),
  updatedAt: row.updated_at.toISOString(),
});

const mapEducation = (row: {
  id: string; topic_key: string; title: string; audience: string; summary: string; action_points: string[];
  trigger_case_type: string | null; trigger_animal_status: string | null; language_code: string;
  created_at: Date; updated_at: Date;
}): AdminEducationContent => ({
  id: row.id,
  topicKey: row.topic_key,
  title: row.title,
  audience: row.audience,
  summary: row.summary,
  actionPoints: row.action_points ?? [],
  triggerCaseType: row.trigger_case_type,
  triggerAnimalStatus: row.trigger_animal_status,
  languageCode: row.language_code,
  createdAt: row.created_at.toISOString(),
  updatedAt: row.updated_at.toISOString(),
});

const mapBehaviour = (row: {
  id: string; situation_type: string; title: string; content: string; do_items: string[]; dont_items: string[];
  audience: string | null; is_active: boolean; created_at: Date; updated_at: Date;
}): AdminBehaviourGuidance => ({
  id: row.id,
  situationType: row.situation_type,
  title: row.title,
  body: row.content,
  doItems: row.do_items ?? [],
  dontItems: row.dont_items ?? [],
  audience: row.audience,
  category: row.situation_type,
  published: row.is_active,
  createdAt: row.created_at.toISOString(),
  updatedAt: row.updated_at.toISOString(),
});

const mapHelpline = (row: {
  id: string; name: string; phone: string; city: string | null; is_24hr: boolean; created_at: Date; updated_at: Date;
}): AdminHelpline => ({
  id: row.id,
  name: row.name,
  number: row.phone,
  area: row.city,
  availableHours: row.is_24hr ? "24 hours" : null,
  createdAt: row.created_at.toISOString(),
  updatedAt: row.updated_at.toISOString(),
});

class AdminService {
  async listResponders(limit = 200): Promise<AdminResponder[]> {
    const result = await query<{
      id: string; full_name: string | null; phone: string; role: UserRole; identity_tier: number;
      reputation_score: string | number; latitude: number | null; longitude: number | null;
      active_case_count: string | number; completed_case_count: string | number; is_available: boolean; updated_at: Date;
    }>(
      `
        SELECT
          u.id, u.full_name, u.phone, u.role, u.identity_tier, u.reputation_score,
          ST_Y(u.home_location::geometry) AS latitude,
          ST_X(u.home_location::geometry) AS longitude,
          COUNT(c.id)::int AS active_case_count,
          u.completed_case_count,
          u.is_available,
          u.updated_at
        FROM users u
        LEFT JOIN cases c
          ON c.assigned_to_user_id = u.id
         AND c.status IN ('open', 'in_review', 'action_taken', 'VERIFIED_REIMBURSEMENT')
        WHERE u.is_available = TRUE
        GROUP BY u.id
        ORDER BY u.reputation_score DESC, active_case_count ASC, u.updated_at DESC
        LIMIT $1
      `,
      [limit]
    );
    return result.rows.map(mapResponder);
  }

  async assignCase(actor: AuthenticatedUser, caseId: string, responderId: string): Promise<CaseRecord> {
    if (!["admin", "ngo", "govt"].includes(actor.role)) {
      throw new AppError("Only admins, NGOs, and government users can assign cases.", 403, "FORBIDDEN");
    }
    const updated = await caseRepository.update(caseId, { assignedToUserId: responderId, status: "in_review" }, actor.id);
    if (!updated) throw new AppError("Case not found", 404, "CASE_NOT_FOUND");
    return updated;
  }

  async listFundingCases(limit = 200): Promise<AdminFundingCase[]> {
    const result = await query<{
      id: string; case_id: string | null; type: string; total_amount: string | number; amount_raised: string | number;
      status: string; created_at: Date; updated_at: Date; hospital_name: string | null; verifier_name: string | null;
    }>(
      `
        SELECT
          fc.id, fc.case_id, fc.type, fc.total_amount, fc.amount_raised, fc.status,
          fc.created_at, fc.created_at AS updated_at,
          NULL::text AS hospital_name,
          NULL::text AS verifier_name
        FROM funding_cases fc
        ORDER BY fc.created_at DESC
        LIMIT $1
      `,
      [limit]
    );
    return result.rows.map(mapFundingCase);
  }

  async listFundingTransactions(fundingCaseId: string): Promise<FundingTransactionRecord[]> {
    const result = await query<{
      id: string; funding_case_id: string; user_id: string; amount: string | number; payment_status: string;
      is_matched: boolean; matched_by_sponsor_id: string | null; matched_amount: string | number | null;
      donor_name: string | null; is_anonymous: boolean; created_at: Date;
    }>(
      `
        SELECT id, funding_case_id, user_id, amount, payment_status, is_matched, matched_by_sponsor_id,
               matched_amount, donor_name, is_anonymous, created_at
        FROM funding_transactions
        WHERE funding_case_id = $1
        ORDER BY created_at DESC
      `,
      [fundingCaseId]
    );
    return result.rows.map((row) => ({
      id: row.id,
      fundingCaseId: row.funding_case_id,
      userId: row.user_id,
      amount: Number(row.amount),
      paymentStatus: row.payment_status as FundingTransactionRecord["paymentStatus"],
      isMatched: row.is_matched,
      matchedBySponsorId: row.matched_by_sponsor_id,
      matchedAmount: row.matched_amount === null ? null : Number(row.matched_amount),
      donorName: row.donor_name,
      isAnonymous: row.is_anonymous,
      createdAt: row.created_at,
    }));
  }

  async listReimbursements(limit = 200): Promise<AdminReimbursement[]> {
    const result = await query<{
      id: string; case_id: string; volunteer_id: string; requester_name: string | null; amount_claimed: string | number;
      status: string; hospital_verified: boolean; bill_url: string; prescription_url: string; created_at: Date; updated_at: Date;
    }>(
      `
        SELECT
          rr.id, rr.case_id, rr.volunteer_id, u.full_name AS requester_name, rr.amount_claimed,
          rr.status,
          EXISTS (
            SELECT 1 FROM hospital_verifications hv
            WHERE hv.reimbursement_id = rr.id AND hv.verified = TRUE
          ) AS hospital_verified,
          rr.bill_url, rr.prescription_url, rr.created_at, rr.created_at AS updated_at
        FROM reimbursement_requests rr
        LEFT JOIN users u ON u.id = rr.volunteer_id
        ORDER BY rr.created_at DESC
        LIMIT $1
      `,
      [limit]
    );
    return result.rows.map(mapReimbursement);
  }

  async listPartners(type?: AdminPartner["type"], limit = 200): Promise<AdminPartner[]> {
    const result = await query<{
      id: string; name: string; type: AdminPartner["type"]; phone: string | null; email: string | null;
      address: string | null; latitude: string | number | null; longitude: string | number | null;
      is_verified: boolean; services: string[]; created_at: Date; updated_at: Date;
    }>(
      `
        SELECT * FROM (
          SELECT pc.id, pc.name, 'clinic'::text AS type, pc.phone, NULL::text AS email, pc.address,
                 pc.latitude::double precision AS latitude, pc.longitude::double precision AS longitude,
                 pc.is_verified, ARRAY[]::text[] AS services, pc.created_at, pc.updated_at
          FROM partner_clinics pc WHERE pc.is_active = TRUE
          UNION ALL
          SELECT ps.id, ps.name, 'store'::text, ps.phone, NULL::text, ps.address,
                 ps.latitude::double precision, ps.longitude::double precision, ps.is_verified,
                 ARRAY[]::text[] AS services, ps.created_at, ps.updated_at
          FROM partner_stores ps WHERE ps.is_active = TRUE
          UNION ALL
          SELECT wo.id, wo.name, 'ngo'::text, wo.phone, wo.email, wo.address,
                 wo.latitude::double precision, wo.longitude::double precision, wo.is_verified,
                 ARRAY[]::text[] AS services, wo.created_at, wo.created_at AS updated_at
          FROM welfare_orgs wo WHERE wo.is_active = TRUE
          UNION ALL
          SELECT h.id, h.name, 'helpline'::text, h.phone, NULL::text, h.description AS address,
                 NULL::double precision, NULL::double precision, TRUE,
                 ARRAY[h.category]::text[] AS services, h.created_at, h.created_at AS updated_at
          FROM helplines h WHERE h.is_active = TRUE
          UNION ALL
          SELECT ac.id, ac.name, 'abc_centre'::text, ac.phone, NULL::text, ac.address,
                 ac.latitude::double precision, ac.longitude::double precision, ac.is_verified,
                 ARRAY[]::text[] AS services, ac.created_at, ac.created_at AS updated_at
          FROM abc_centres ac WHERE ac.is_active = TRUE
          UNION ALL
          SELECT wc.id, wc.name, 'wildlife_centre'::text, wc.phone, NULL::text, wc.address,
                 wc.latitude::double precision, wc.longitude::double precision, wc.is_24hr,
                 wc.accepted_species, wc.created_at, wc.created_at AS updated_at
          FROM wildlife_centers wc WHERE wc.is_active = TRUE
        ) partners
        WHERE $1::text IS NULL OR type = $1
        ORDER BY created_at DESC
        LIMIT $2
      `,
      [type ?? null, limit]
    );
    return result.rows.map(mapPartner);
  }

  async banUser(userId: string, banned: boolean): Promise<void> {
    await query(`UPDATE users SET is_banned = $2, updated_at = NOW() WHERE id = $1`, [userId, banned]);
  }

  async updateRole(userId: string, role: UserRole): Promise<void> {
    await query(`UPDATE users SET role = $2, updated_at = NOW() WHERE id = $1`, [userId, role]);
  }

  async verifyIdentity(userId: string, verified: boolean): Promise<void> {
    await query(
      `
        UPDATE users
        SET identity_tier = CASE WHEN $2 THEN GREATEST(COALESCE(identity_tier, 0), 1) ELSE 0 END,
            aadhaar_verified_at = CASE WHEN $2 THEN COALESCE(aadhaar_verified_at, NOW()) ELSE NULL END,
            updated_at = NOW()
        WHERE id = $1
      `,
      [userId, verified]
    );
  }

  async listWardSummaries(): Promise<AdminWardSummary[]> {
    const result = await query<{ ward_name: string; total_animals: string | number; abc_coverage_pct: string | number; vaccination_rate_pct: string | number; open_cases: string | number; avg_response_hours: string | number | null }>(
      `
        SELECT
          ward_name,
          COUNT(*)::int AS total_animals,
          AVG(CASE WHEN is_sterilized THEN 1 ELSE 0 END) * 100 AS abc_coverage_pct,
          AVG(CASE WHEN vaccination_status = 'verified' THEN 1 ELSE 0 END) * 100 AS vaccination_rate_pct,
          SUM(CASE WHEN status IN ('open', 'in_review', 'action_taken') THEN 1 ELSE 0 END)::int AS open_cases,
          NULL::double precision AS avg_response_hours
        FROM animals
        GROUP BY ward_name
        ORDER BY total_animals DESC
      `
    );
    return result.rows.map((row) => ({
      wardNumber: row.ward_name,
      wardName: row.ward_name,
      animalCount: Number(row.total_animals),
      abcCoveragePercent: Number(row.abc_coverage_pct),
      vaccinationRatePercent: Number(row.vaccination_rate_pct),
      openCases: Number(row.open_cases),
      avgResponseHours: row.avg_response_hours === null ? null : Number(row.avg_response_hours),
    }));
  }

  async listEducationContent(limit = 200): Promise<AdminEducationContent[]> {
    const result = await query<{
      id: string; topic_key: string; title: string; audience: string; summary: string; action_points: string[];
      trigger_case_type: string | null; trigger_animal_status: string | null; language_code: string;
      created_at: Date; updated_at: Date;
    }>(
      `
        SELECT id, topic_key, title, audience, summary, action_points, trigger_case_type,
               trigger_animal_status, language_code, created_at, created_at AS updated_at
        FROM education_content
        ORDER BY created_at DESC
        LIMIT $1
      `,
      [limit]
    );
    return result.rows.map(mapEducation);
  }

  async createEducationContent(input: Omit<AdminEducationContent, "id" | "createdAt" | "updatedAt">): Promise<AdminEducationContent> {
    const result = await query<{ id: string; topic_key: string; title: string; audience: string; summary: string; action_points: string[]; trigger_case_type: string | null; trigger_animal_status: string | null; language_code: string; created_at: Date }>(
      `
        INSERT INTO education_content (topic_key, title, audience, summary, action_points, trigger_case_type, trigger_animal_status, language_code)
        VALUES ($1, $2, $3, $4, $5, $6::case_type, $7::animal_status, $8)
        RETURNING id, topic_key, title, audience, summary, action_points, trigger_case_type, trigger_animal_status, language_code, created_at
      `,
      [input.topicKey, input.title, input.audience, input.summary, input.actionPoints, input.triggerCaseType, input.triggerAnimalStatus, input.languageCode]
    );
    return mapEducation({ ...result.rows[0], updated_at: result.rows[0].created_at });
  }

  async updateEducationContent(id: string, input: Partial<Omit<AdminEducationContent, "id" | "createdAt" | "updatedAt">>): Promise<AdminEducationContent> {
    const current = await this.listEducationContent(1000);
    const existing = current.find((item) => item.id === id);
    if (!existing) throw new AppError("Education content not found", 404, "CONTENT_NOT_FOUND");
    const merged = { ...existing, ...input };
    await query(
      `
        UPDATE education_content
        SET topic_key = $2, title = $3, audience = $4, summary = $5, action_points = $6,
            trigger_case_type = $7::case_type, trigger_animal_status = $8::animal_status, language_code = $9
        WHERE id = $1
      `,
      [id, merged.topicKey, merged.title, merged.audience, merged.summary, merged.actionPoints, merged.triggerCaseType, merged.triggerAnimalStatus, merged.languageCode]
    );
    return { ...merged, updatedAt: new Date().toISOString() };
  }

  async deleteEducationContent(id: string): Promise<void> {
    await query(`DELETE FROM education_content WHERE id = $1`, [id]);
  }

  async listBehaviourGuidance(limit = 200): Promise<AdminBehaviourGuidance[]> {
    const result = await query<{
      id: string; situation_type: string; title: string; content: string; do_items: string[]; dont_items: string[];
      audience: string | null; is_active: boolean; created_at: Date; updated_at: Date;
    }>(
      `
        SELECT id, situation_type, title, content, do_items, dont_items, audience, is_active,
               created_at, created_at AS updated_at
        FROM behaviour_guidance_cards
        ORDER BY display_order ASC, created_at DESC
        LIMIT $1
      `,
      [limit]
    );
    return result.rows.map(mapBehaviour);
  }

  async createBehaviourGuidance(input: Omit<AdminBehaviourGuidance, "id" | "createdAt" | "updatedAt">): Promise<AdminBehaviourGuidance> {
    const result = await query<{ id: string; situation_type: string; title: string; content: string; do_items: string[]; dont_items: string[]; audience: string | null; is_active: boolean; created_at: Date }>(
      `
        INSERT INTO behaviour_guidance_cards (situation_type, title, content, do_items, dont_items, audience, is_active)
        VALUES ($1, $2, $3, $4, $5, $6, $7)
        RETURNING id, situation_type, title, content, do_items, dont_items, audience, is_active, created_at
      `,
      [input.situationType, input.title, input.body, input.doItems, input.dontItems, input.audience, input.published]
    );
    return mapBehaviour({ ...result.rows[0], updated_at: result.rows[0].created_at });
  }

  async updateBehaviourGuidance(id: string, input: Partial<Omit<AdminBehaviourGuidance, "id" | "createdAt" | "updatedAt">>): Promise<AdminBehaviourGuidance> {
    const current = await this.listBehaviourGuidance(1000);
    const existing = current.find((item) => item.id === id);
    if (!existing) throw new AppError("Guidance card not found", 404, "CONTENT_NOT_FOUND");
    const merged = { ...existing, ...input };
    await query(
      `
        UPDATE behaviour_guidance_cards
        SET situation_type = $2, title = $3, content = $4, do_items = $5, dont_items = $6,
            audience = $7, is_active = $8
        WHERE id = $1
      `,
      [id, merged.situationType, merged.title, merged.body, merged.doItems, merged.dontItems, merged.audience, merged.published]
    );
    return { ...merged, updatedAt: new Date().toISOString() };
  }

  async deleteBehaviourGuidance(id: string): Promise<void> {
    await query(`UPDATE behaviour_guidance_cards SET is_active = FALSE WHERE id = $1`, [id]);
  }

  async listHelplines(limit = 200): Promise<AdminHelpline[]> {
    const result = await query<{ id: string; name: string; phone: string; city: string | null; is_24hr: boolean; created_at: Date }>(
      `
        SELECT id, name, phone, city, is_24hr, created_at
        FROM helplines
        WHERE is_active = TRUE
        ORDER BY created_at DESC
        LIMIT $1
      `,
      [limit]
    );
    return result.rows.map((row) => mapHelpline({ ...row, updated_at: row.created_at }));
  }

  async createHelpline(input: Omit<AdminHelpline, "id" | "createdAt" | "updatedAt">): Promise<AdminHelpline> {
    const result = await query<{ id: string; name: string; phone: string; city: string | null; is_24hr: boolean; created_at: Date }>(
      `
        INSERT INTO helplines (name, phone, description, category, city, is_24hr)
        VALUES ($1, $2, $3, $4, $5, $6)
        RETURNING id, name, phone, city, is_24hr, created_at
      `,
      [input.name, input.number, input.availableHours ?? "", "general", input.area, input.availableHours === "24 hours"]
    );
    return mapHelpline({ ...result.rows[0], updated_at: result.rows[0].created_at });
  }

  async updateHelpline(id: string, input: Partial<Omit<AdminHelpline, "id" | "createdAt" | "updatedAt">>): Promise<AdminHelpline> {
    const current = await this.listHelplines(1000);
    const existing = current.find((item) => item.id === id);
    if (!existing) throw new AppError("Helpline not found", 404, "CONTENT_NOT_FOUND");
    const merged = { ...existing, ...input };
    await query(
      `
        UPDATE helplines
        SET name = $2, phone = $3, description = $4, city = $5, is_24hr = $6
        WHERE id = $1
      `,
      [id, merged.name, merged.number, merged.availableHours ?? "", merged.area, merged.availableHours === "24 hours"]
    );
    return { ...merged, updatedAt: new Date().toISOString() };
  }

  async deleteHelpline(id: string): Promise<void> {
    await query(`UPDATE helplines SET is_active = FALSE WHERE id = $1`, [id]);
  }

  async listAlerts(limit = 20): Promise<AdminAlert[]> {
    const casesResult = await query<{ id: string; title: string; body: string; severity: string; created_at: Date }>(
      `
        SELECT id, title,
               CONCAT('Priority ', priority, ' ', case_type, ' case needs attention.') AS body,
               CASE WHEN priority = 'high' THEN 'critical' ELSE 'warning' END AS severity,
               created_at
        FROM cases
        WHERE status IN ('open', 'in_review')
        ORDER BY created_at DESC
        LIMIT $1
      `,
      [limit]
    );
    return casesResult.rows.map((row) => ({
      id: row.id,
      title: row.title,
      body: row.body,
      severity: row.severity as "info" | "warning" | "critical",
      createdAt: row.created_at.toISOString(),
      read: false,
    }));
  }

  async monthlyResolvedCases(): Promise<AdminMonthlyCase[]> {
    const result = await query<{ month: string; resolved: string | number; opened: string | number }>(
      `
        SELECT to_char(date_trunc('month', created_at), 'YYYY-MM') AS month,
               COUNT(*) FILTER (WHERE status IN ('resolved', 'closed'))::int AS resolved,
               COUNT(*) FILTER (WHERE created_at >= NOW() - INTERVAL '12 months')::int AS opened
        FROM cases
        WHERE created_at >= NOW() - INTERVAL '12 months'
        GROUP BY 1
        ORDER BY 1
      `
    );
    return result.rows.map((row) => ({ month: row.month, resolved: Number(row.resolved), opened: Number(row.opened) }));
  }
}

export const adminService = new AdminService();
