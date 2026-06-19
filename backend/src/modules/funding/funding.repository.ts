import { query, withTransaction } from "../../config/db";
import { AppError } from "../../middleware/error.middleware";
import {
  FundingCaseRecord,
  FundingStatus,
  FundingTransactionRecord,
  FundingType,
  HospitalVerificationRecord,
  PaymentStatus,
  PayoutRecord,
  PayoutRecipientType,
  ReimbursementRequestRecord,
  ReimbursementStatus
} from "../../types/global.types";

interface FundingCaseRow {
  id: string;
  case_id: string;
  type: FundingType;
  total_amount: string | number;
  amount_raised: string | number;
  status: FundingStatus;
  created_at: Date;
}

interface FundingTransactionRow {
  id: string;
  funding_case_id: string;
  user_id: string;
  amount: string | number;
  payment_status: PaymentStatus;
  is_matched: boolean;
  matched_by_sponsor_id: string | null;
  matched_amount: string | number | null;
  donor_name: string | null;
  is_anonymous: boolean;
  created_at: Date;
}

interface ReimbursementRequestRow {
  id: string;
  case_id: string;
  volunteer_id: string;
  amount_claimed: string | number;
  bill_url: string;
  prescription_url: string;
  doctor_name: string;
  hospital_id: string;
  status: ReimbursementStatus;
  created_at: Date;
}

interface HospitalVerificationRow {
  id: string;
  reimbursement_id: string;
  hospital_id: string;
  verified: boolean;
  notes: string | null;
  verified_at: Date;
}

interface PayoutRow {
  id: string;
  funding_case_id: string;
  recipient_type: PayoutRecipientType;
  recipient_id: string;
  amount: string | number;
  status: "PENDING" | "RELEASED";
  created_at: Date;
}

const fundingCaseSelect = `
  SELECT
    fc.id,
    fc.case_id,
    fc.type,
    fc.total_amount,
    fc.amount_raised,
    fc.status,
    fc.created_at
  FROM funding_cases fc
`;

const reimbursementSelect = `
  SELECT
    rr.id,
    rr.case_id,
    rr.volunteer_id,
    rr.amount_claimed,
    rr.bill_url,
    rr.prescription_url,
    rr.doctor_name,
    rr.hospital_id,
    rr.status,
    rr.created_at
  FROM reimbursement_requests rr
`;

const payoutSelect = `
  SELECT
    p.id,
    p.funding_case_id,
    p.recipient_type,
    p.recipient_id,
    p.amount,
    p.status,
    p.created_at
  FROM payouts p
`;

const mapFundingCase = (row: FundingCaseRow): FundingCaseRecord => ({
  id: row.id,
  caseId: row.case_id,
  type: row.type,
  totalAmount: Number(row.total_amount),
  amountRaised: Number(row.amount_raised),
  status: row.status,
  createdAt: row.created_at
});

const mapFundingTransaction = (row: FundingTransactionRow): FundingTransactionRecord => ({
  id: row.id,
  fundingCaseId: row.funding_case_id,
  userId: row.user_id,
  amount: Number(row.amount),
  paymentStatus: row.payment_status,
  isMatched: row.is_matched,
  matchedBySponsorId: row.matched_by_sponsor_id,
  matchedAmount: row.matched_amount === null ? null : Number(row.matched_amount),
  donorName: row.donor_name,
  isAnonymous: row.is_anonymous,
  createdAt: row.created_at
});

const mapReimbursementRequest = (row: ReimbursementRequestRow): ReimbursementRequestRecord => ({
  id: row.id,
  caseId: row.case_id,
  volunteerId: row.volunteer_id,
  amountClaimed: Number(row.amount_claimed),
  billUrl: row.bill_url,
  prescriptionUrl: row.prescription_url,
  doctorName: row.doctor_name,
  hospitalId: row.hospital_id,
  status: row.status,
  createdAt: row.created_at
});

const mapHospitalVerification = (row: HospitalVerificationRow): HospitalVerificationRecord => ({
  id: row.id,
  reimbursementId: row.reimbursement_id,
  hospitalId: row.hospital_id,
  verified: row.verified,
  notes: row.notes,
  verifiedAt: row.verified_at
});

const mapPayout = (row: PayoutRow): PayoutRecord => ({
  id: row.id,
  fundingCaseId: row.funding_case_id,
  recipientType: row.recipient_type,
  recipientId: row.recipient_id,
  amount: Number(row.amount),
  status: row.status,
  createdAt: row.created_at
});

interface CreateFundingCaseInput {
  caseId: string;
  type: FundingType;
  totalAmount: number;
  recipientType: PayoutRecipientType;
  recipientId: string;
  payoutAmount: number;
}

interface DonationInput {
  fundingCaseId: string;
  userId: string;
  amount: number;
  paymentStatus: PaymentStatus;
}

interface CreateReimbursementInput {
  caseId: string;
  volunteerId: string;
  amountClaimed: number;
  billUrl: string;
  prescriptionUrl: string;
  doctorName: string;
  hospitalId: string;
}

interface VerifyReimbursementInput {
  reimbursementId: string;
  hospitalId: string;
  verified: boolean;
  notes?: string | null;
}

class FundingRepository {
  async findFundingCaseById(fundingCaseId: string): Promise<FundingCaseRecord | null> {
    const result = await query<FundingCaseRow>(
      `${fundingCaseSelect} WHERE fc.id = $1 LIMIT 1`,
      [fundingCaseId]
    );

    return result.rows[0] ? mapFundingCase(result.rows[0]) : null;
  }

  async findOpenFundingCaseByCaseId(
    caseId: string,
    type: FundingType
  ): Promise<FundingCaseRecord | null> {
    const result = await query<FundingCaseRow>(
      `${fundingCaseSelect} WHERE fc.case_id = $1 AND fc.type = $2 AND fc.status = 'OPEN' LIMIT 1`,
      [caseId, type]
    );

    return result.rows[0] ? mapFundingCase(result.rows[0]) : null;
  }

  async findFundingCaseByCaseIdAndType(
    caseId: string,
    type: FundingType
  ): Promise<FundingCaseRecord | null> {
    const result = await query<FundingCaseRow>(
      `${fundingCaseSelect} WHERE fc.case_id = $1 AND fc.type = $2 ORDER BY fc.created_at DESC LIMIT 1`,
      [caseId, type]
    );

    return result.rows[0] ? mapFundingCase(result.rows[0]) : null;
  }

  async listTransactionsForFundingCase(
    fundingCaseId: string
  ): Promise<FundingTransactionRecord[]> {
    const result = await query<FundingTransactionRow>(
      `
        SELECT
          id,
          funding_case_id,
          user_id,
          amount,
          payment_status,
          is_matched,
          matched_by_sponsor_id,
          matched_amount,
          donor_name,
          is_anonymous,
          created_at
        FROM funding_transactions
        WHERE funding_case_id = $1
        ORDER BY created_at DESC
      `,
      [fundingCaseId]
    );

    return result.rows.map(mapFundingTransaction);
  }

  async findPayoutByFundingCaseId(fundingCaseId: string): Promise<PayoutRecord | null> {
    const result = await query<PayoutRow>(
      `${payoutSelect} WHERE p.funding_case_id = $1 ORDER BY p.created_at DESC LIMIT 1`,
      [fundingCaseId]
    );

    return result.rows[0] ? mapPayout(result.rows[0]) : null;
  }

  async createFundingCaseWithPayout(
    input: CreateFundingCaseInput
  ): Promise<{ fundingCase: FundingCaseRecord; payout: PayoutRecord }> {
    return withTransaction(async (client) => {
      const fundingCaseResult = await client.query<FundingCaseRow>(
        `
          INSERT INTO funding_cases (case_id, type, total_amount, amount_raised, status)
          VALUES ($1, $2, $3, 0, 'OPEN')
          RETURNING id, case_id, type, total_amount, amount_raised, status, created_at
        `,
        [input.caseId, input.type, input.totalAmount]
      );

      const payoutResult = await client.query<PayoutRow>(
        `
          INSERT INTO payouts (funding_case_id, recipient_type, recipient_id, amount, status)
          VALUES ($1, $2, $3, $4, 'PENDING')
          RETURNING
            id,
            funding_case_id,
            recipient_type,
            recipient_id,
            amount,
            status,
            created_at
        `,
        [
          fundingCaseResult.rows[0].id,
          input.recipientType,
          input.recipientId,
          input.payoutAmount
        ]
      );

      return {
        fundingCase: mapFundingCase(fundingCaseResult.rows[0]),
        payout: mapPayout(payoutResult.rows[0])
      };
    });
  }

  async recordDonation(
    input: DonationInput
  ): Promise<{
    fundingCase: FundingCaseRecord;
    transaction: FundingTransactionRecord;
    payout: PayoutRecord | null;
  }> {
    return withTransaction(async (client) => {
      const fundingCaseResult = await client.query<FundingCaseRow>(
        `${fundingCaseSelect} WHERE fc.id = $1 FOR UPDATE`,
        [input.fundingCaseId]
      );

      const fundingCaseRow = fundingCaseResult.rows[0];

      if (!fundingCaseRow) {
        throw new AppError("Funding case not found", 404, "FUNDING_NOT_FOUND");
      }

      if (fundingCaseRow.status !== "OPEN") {
        throw new AppError("Funding case is not open for donations", 400, "FUNDING_NOT_OPEN");
      }

      const remainingAmount =
        Number(fundingCaseRow.total_amount) - Number(fundingCaseRow.amount_raised);

      if (input.amount > remainingAmount) {
        throw new AppError("Donation exceeds the remaining funding gap", 400, "OVERFUNDING_BLOCKED");
      }

      const transactionResult = await client.query<FundingTransactionRow>(
        `
          INSERT INTO funding_transactions (funding_case_id, user_id, amount, payment_status)
          VALUES ($1, $2, $3, $4)
          RETURNING id, funding_case_id, user_id, amount, payment_status, created_at
        `,
        [input.fundingCaseId, input.userId, input.amount, input.paymentStatus]
      );

      const payoutResult = await client.query<PayoutRow>(
        `${payoutSelect} WHERE p.funding_case_id = $1 ORDER BY p.created_at DESC LIMIT 1 FOR UPDATE`,
        [input.fundingCaseId]
      );

      let updatedFundingCase = mapFundingCase(fundingCaseRow);

      if (input.paymentStatus === "SUCCESS") {
        const nextRaisedAmount = Number(fundingCaseRow.amount_raised) + input.amount;
        const nextStatus: FundingStatus =
          nextRaisedAmount >= Number(fundingCaseRow.total_amount) ? "CLOSED" : fundingCaseRow.status;

        const updateResult = await client.query<FundingCaseRow>(
          `
            UPDATE funding_cases
            SET amount_raised = amount_raised + $1, status = $2
            WHERE id = $3
            RETURNING id, case_id, type, total_amount, amount_raised, status, created_at
          `,
          [input.amount, nextStatus, input.fundingCaseId]
        );

        updatedFundingCase = mapFundingCase(updateResult.rows[0]);
      }

      return {
        fundingCase: updatedFundingCase,
        transaction: mapFundingTransaction(transactionResult.rows[0]),
        payout: payoutResult.rows[0] ? mapPayout(payoutResult.rows[0]) : null
      };
    });
  }

  async createReimbursementRequest(
    input: CreateReimbursementInput
  ): Promise<ReimbursementRequestRecord> {
    const result = await query<ReimbursementRequestRow>(
      `
        INSERT INTO reimbursement_requests (
          case_id,
          volunteer_id,
          amount_claimed,
          bill_url,
          prescription_url,
          doctor_name,
          hospital_id,
          status
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, 'PENDING_VERIFICATION')
        RETURNING
          id,
          case_id,
          volunteer_id,
          amount_claimed,
          bill_url,
          prescription_url,
          doctor_name,
          hospital_id,
          status,
          created_at
      `,
      [
        input.caseId,
        input.volunteerId,
        input.amountClaimed,
        input.billUrl,
        input.prescriptionUrl,
        input.doctorName,
        input.hospitalId
      ]
    );

    return mapReimbursementRequest(result.rows[0]);
  }

  async findReimbursementRequestById(
    reimbursementId: string
  ): Promise<ReimbursementRequestRecord | null> {
    const result = await query<ReimbursementRequestRow>(
      `${reimbursementSelect} WHERE rr.id = $1 LIMIT 1`,
      [reimbursementId]
    );

    return result.rows[0] ? mapReimbursementRequest(result.rows[0]) : null;
  }

  async findActiveReimbursementByCaseId(
    caseId: string
  ): Promise<ReimbursementRequestRecord | null> {
    const result = await query<ReimbursementRequestRow>(
      `
        ${reimbursementSelect}
        WHERE rr.case_id = $1
          AND rr.status IN ('PENDING_VERIFICATION', 'VERIFIED')
        ORDER BY rr.created_at DESC
        LIMIT 1
      `,
      [caseId]
    );

    return result.rows[0] ? mapReimbursementRequest(result.rows[0]) : null;
  }

  async findHospitalVerificationByReimbursementId(
    reimbursementId: string
  ): Promise<HospitalVerificationRecord | null> {
    const result = await query<HospitalVerificationRow>(
      `
        SELECT
          id,
          reimbursement_id,
          hospital_id,
          verified,
          notes,
          verified_at
        FROM hospital_verifications
        WHERE reimbursement_id = $1
        ORDER BY verified_at DESC
        LIMIT 1
      `,
      [reimbursementId]
    );

    return result.rows[0] ? mapHospitalVerification(result.rows[0]) : null;
  }

  async verifyReimbursement(
    input: VerifyReimbursementInput
  ): Promise<{
    reimbursement: ReimbursementRequestRecord;
    verification: HospitalVerificationRecord;
    fundingCase: FundingCaseRecord | null;
    payout: PayoutRecord | null;
  }> {
    return withTransaction(async (client) => {
      const reimbursementResult = await client.query<ReimbursementRequestRow>(
        `${reimbursementSelect} WHERE rr.id = $1 FOR UPDATE`,
        [input.reimbursementId]
      );

      const reimbursementRow = reimbursementResult.rows[0];

      if (!reimbursementRow) {
        throw new AppError("Reimbursement request not found", 404, "REIMBURSEMENT_NOT_FOUND");
      }

      if (reimbursementRow.status !== "PENDING_VERIFICATION") {
        throw new AppError(
          "Reimbursement request has already been processed",
          400,
          "REIMBURSEMENT_ALREADY_PROCESSED"
        );
      }

      const verificationResult = await client.query<HospitalVerificationRow>(
        `
          INSERT INTO hospital_verifications (reimbursement_id, hospital_id, verified, notes, verified_at)
          VALUES ($1, $2, $3, $4, NOW())
          RETURNING id, reimbursement_id, hospital_id, verified, notes, verified_at
        `,
        [input.reimbursementId, input.hospitalId, input.verified, input.notes ?? null]
      );

      const updatedStatus: ReimbursementStatus = input.verified ? "VERIFIED" : "REJECTED";
      const updatedReimbursementResult = await client.query<ReimbursementRequestRow>(
        `
          UPDATE reimbursement_requests
          SET status = $1
          WHERE id = $2
          RETURNING
            id,
            case_id,
            volunteer_id,
            amount_claimed,
            bill_url,
            prescription_url,
            doctor_name,
            hospital_id,
            status,
            created_at
        `,
        [updatedStatus, input.reimbursementId]
      );

      let fundingCase: FundingCaseRecord | null = null;
      let payout: PayoutRecord | null = null;

      if (input.verified) {
        const fundingCaseResult = await client.query<FundingCaseRow>(
          `
            INSERT INTO funding_cases (case_id, type, total_amount, amount_raised, status)
            VALUES ($1, 'REIMBURSEMENT', $2, 0, 'OPEN')
            RETURNING id, case_id, type, total_amount, amount_raised, status, created_at
          `,
          [reimbursementRow.case_id, reimbursementRow.amount_claimed]
        );

        const payoutResult = await client.query<PayoutRow>(
          `
            INSERT INTO payouts (funding_case_id, recipient_type, recipient_id, amount, status)
            VALUES ($1, 'VOLUNTEER', $2, $3, 'PENDING')
            RETURNING
              id,
              funding_case_id,
              recipient_type,
              recipient_id,
              amount,
              status,
              created_at
          `,
          [
            fundingCaseResult.rows[0].id,
            reimbursementRow.volunteer_id,
            reimbursementRow.amount_claimed
          ]
        );

        await client.query(
          `
            UPDATE cases
            SET status = 'VERIFIED_REIMBURSEMENT', updated_at = NOW()
            WHERE id = $1
          `,
          [reimbursementRow.case_id]
        );

        fundingCase = mapFundingCase(fundingCaseResult.rows[0]);
        payout = mapPayout(payoutResult.rows[0]);
      }

      return {
        reimbursement: mapReimbursementRequest(updatedReimbursementResult.rows[0]),
        verification: mapHospitalVerification(verificationResult.rows[0]),
        fundingCase,
        payout
      };
    });
  }

  async releasePayout(
    fundingCaseId: string
  ): Promise<{ fundingCase: FundingCaseRecord; payout: PayoutRecord } | null> {
    return withTransaction(async (client) => {
      const fundingCaseResult = await client.query<FundingCaseRow>(
        `${fundingCaseSelect} WHERE fc.id = $1 FOR UPDATE`,
        [fundingCaseId]
      );

      const fundingCaseRow = fundingCaseResult.rows[0];

      if (!fundingCaseRow) {
        throw new AppError("Funding case not found", 404, "FUNDING_NOT_FOUND");
      }

      const payoutResult = await client.query<PayoutRow>(
        `${payoutSelect} WHERE p.funding_case_id = $1 ORDER BY p.created_at DESC LIMIT 1 FOR UPDATE`,
        [fundingCaseId]
      );

      const payoutRow = payoutResult.rows[0];

      if (!payoutRow) {
        return null;
      }

      if (payoutRow.status !== "PENDING") {
        throw new AppError("Payout has already been released", 400, "PAYOUT_ALREADY_RELEASED");
      }

      if (fundingCaseRow.status !== "CLOSED") {
        throw new AppError("Funding case is not fully funded yet", 400, "FUNDING_INCOMPLETE");
      }

      if (Number(fundingCaseRow.amount_raised) < Number(payoutRow.amount)) {
        throw new AppError("Escrow balance is insufficient for payout", 400, "INSUFFICIENT_ESCROW");
      }

      const updatedPayoutResult = await client.query<PayoutRow>(
        `
          UPDATE payouts
          SET status = 'RELEASED'
          WHERE id = $1
          RETURNING
            id,
            funding_case_id,
            recipient_type,
            recipient_id,
            amount,
            status,
            created_at
        `,
        [payoutRow.id]
      );

      return {
        fundingCase: mapFundingCase(fundingCaseRow),
        payout: mapPayout(updatedPayoutResult.rows[0])
      };
    });
  }
}

export const fundingRepository = new FundingRepository();
