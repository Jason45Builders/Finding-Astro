import { AppError } from "../../middleware/error.middleware";
import {
  AuthenticatedUser,
  CaseRecord,
  FundingCaseRecord,
  FundingTransactionRecord,
  HospitalVerificationRecord,
  PayoutRecord,
  ReimbursementRequestRecord
} from "../../types/global.types";
import { caseService } from "../cases/case.service";
import { notificationService } from "../notifications/notification.service";
import { userService } from "../users/user.service";
import { fundingRepository } from "./funding.repository";
import { getPaymentAdapter, MockPaymentAdapter } from "../../integrations";

const REIMBURSEMENT_LIMIT_DAYS = 30;
const MAX_ACTIVE_REIMBURSEMENTS_PER_WINDOW = 3;

interface CreateFundingInput {
  caseId: string;
  type: "PRE_FUNDED";
  totalAmount: number;
  hospitalId: string;
  estimateUrl: string;
}

interface DonateInput {
  fundingCaseId: string;
  amount: number;
  simulateFailure?: boolean;
}

interface ReimbursementRequestInput {
  caseId: string;
  amountClaimed: number;
  billUrl: string;
  prescriptionUrl: string;
  doctorName: string;
  hospitalId: string;
}

interface ReimbursementVerifyInput {
  reimbursementId: string;
  verified: boolean;
  notes?: string | null;
}

interface ReleasePayoutInput {
  fundingCaseId: string;
}

interface FundingDetail {
  fundingCase: FundingCaseRecord;
  payout: PayoutRecord | null;
  transactions: FundingTransactionRecord[];
  caseRecord: CaseRecord;
}

interface ReimbursementDetail {
  reimbursement: ReimbursementRequestRecord;
  verification: HospitalVerificationRecord | null;
  fundingCase: FundingCaseRecord | null;
  payout: PayoutRecord | null;
  caseRecord: CaseRecord;
}

class FundingService {
  async createFunding(actor: AuthenticatedUser, input: CreateFundingInput): Promise<FundingDetail> {
    const caseRecord = await caseService.getCaseForActor(input.caseId, actor);

    if (input.type !== "PRE_FUNDED") {
      throw new AppError(
        "Only pre-funded treatment pages can be created directly",
        400,
        "INVALID_FUNDING_TYPE"
      );
    }

    const hospital = await userService.ensureHospitalUser(input.hospitalId);
    const existingFunding = await fundingRepository.findOpenFundingCaseByCaseId(
      input.caseId,
      "PRE_FUNDED"
    );

    if (existingFunding) {
      throw new AppError(
        "An open pre-funded page already exists for this case",
        409,
        "FUNDING_ALREADY_EXISTS"
      );
    }

    if (actor.role === "hospital" && actor.id !== hospital.id) {
      throw new AppError(
        "Hospital users can only create funding pages for their own account",
        403,
        "FORBIDDEN"
      );
    }

    if (caseRecord.assignedToUserId && caseRecord.assignedToUserId !== hospital.id) {
      throw new AppError(
        "This case is already linked to a different service provider",
        409,
        "CASE_PROVIDER_MISMATCH"
      );
    }

    await caseService.appendEvidenceUrls(input.caseId, [input.estimateUrl], actor);

    const created = await fundingRepository.createFundingCaseWithPayout({
      caseId: input.caseId,
      type: "PRE_FUNDED",
      totalAmount: input.totalAmount,
      recipientType: "HOSPITAL",
      recipientId: hospital.id,
      payoutAmount: input.totalAmount
    });

    await notificationService.notifyUsers(
      [caseRecord.reporterUserId, hospital.id],
      "funding",
      "Funding page created",
      `A treatment funding page is now open for case ${caseRecord.title}.`,
      {
        caseId: caseRecord.id,
        fundingCaseId: created.fundingCase.id,
        fundingType: created.fundingCase.type
      }
    );

    return {
      fundingCase: created.fundingCase,
      payout: created.payout,
      transactions: [],
      caseRecord
    };
  }

  async getFundingById(_actor: AuthenticatedUser, fundingCaseId: string): Promise<FundingDetail> {
    const fundingCase = await fundingRepository.findFundingCaseById(fundingCaseId);

    if (!fundingCase) {
      throw new AppError("Funding case not found", 404, "FUNDING_NOT_FOUND");
    }

    const [payout, transactions, caseRecord] = await Promise.all([
      fundingRepository.findPayoutByFundingCaseId(fundingCaseId),
      fundingRepository.listTransactionsForFundingCase(fundingCaseId),
      caseService.getCaseById(fundingCase.caseId)
    ]);

    return {
      fundingCase,
      payout,
      transactions,
      caseRecord
    };
  }

  async donate(actor: AuthenticatedUser, input: DonateInput): Promise<FundingDetail & {
    transaction: FundingTransactionRecord;
  }> {
    const fundingDetail = await this.getFundingById(actor, input.fundingCaseId);

    if (fundingDetail.fundingCase.status !== "OPEN") {
      throw new AppError("Funding page is no longer open", 400, "FUNDING_NOT_OPEN");
    }

    if (fundingDetail.payout && fundingDetail.payout.recipientId === actor.id) {
      throw new AppError(
        "Recipients cannot donate into their own payout stream",
        403,
        "SELF_FUNDING_BLOCKED"
      );
    }

    const remainingAmount =
      fundingDetail.fundingCase.totalAmount - fundingDetail.fundingCase.amountRaised;

    if (input.amount > remainingAmount) {
      throw new AppError("Donation exceeds the remaining funding gap", 400, "OVERFUNDING_BLOCKED");
    }

    // Create payment order via adapter (amount in paise for Razorpay/Stripe)
    const paymentAdapter = getPaymentAdapter();
    const order = await paymentAdapter.createOrder(input.amount * 100, {
      fundingCaseId: input.fundingCaseId,
      userId: actor.id,
      caseTitle: fundingDetail.caseRecord.title,
    });

    // If simulateFailure is set and we're using the mock adapter, force failure
    if (input.simulateFailure && paymentAdapter instanceof MockPaymentAdapter) {
      paymentAdapter.setStatus(order.id, "failed");
    }

    // Resolve payment status (mock auto-resolves after 30s; real stubs return created)
    const resolvedOrder = await paymentAdapter.getPaymentStatus(order.id);
    const paymentStatus: "PENDING" | "SUCCESS" | "FAILED" =
      resolvedOrder.status === "paid" ? "SUCCESS" : resolvedOrder.status === "failed" ? "FAILED" : "PENDING";

    const donationResult = await fundingRepository.recordDonation({
      fundingCaseId: input.fundingCaseId,
      userId: actor.id,
      amount: input.amount,
      paymentStatus
    });

    if (donationResult.transaction.paymentStatus === "SUCCESS") {
      await notificationService.notifyUsers(
        [
          fundingDetail.caseRecord.reporterUserId,
          ...(fundingDetail.payout ? [fundingDetail.payout.recipientId] : [])
        ],
        "funding",
        "Donation received",
        `A donation of ${input.amount.toFixed(2)} has been received for ${fundingDetail.caseRecord.title}.`,
        {
          caseId: fundingDetail.caseRecord.id,
          fundingCaseId: donationResult.fundingCase.id,
          transactionId: donationResult.transaction.id,
          amount: input.amount
        }
      );

      if (donationResult.fundingCase.status === "CLOSED") {
        await notificationService.notifyUsers(
          [
            fundingDetail.caseRecord.reporterUserId,
            ...(fundingDetail.payout ? [fundingDetail.payout.recipientId] : [])
          ],
          "funding",
          "Funding completed",
          `Funding is complete for ${fundingDetail.caseRecord.title}. The payout is ready for platform release.`,
          {
            caseId: fundingDetail.caseRecord.id,
            fundingCaseId: donationResult.fundingCase.id
          }
        );
      }
    }

    const transactions = await fundingRepository.listTransactionsForFundingCase(input.fundingCaseId);

    return {
      fundingCase: donationResult.fundingCase,
      payout: donationResult.payout,
      transactions,
      transaction: donationResult.transaction,
      caseRecord: fundingDetail.caseRecord
    };
  }

  async requestReimbursement(
    actor: AuthenticatedUser,
    input: ReimbursementRequestInput
  ): Promise<ReimbursementDetail> {
    if (actor.role === "hospital") {
      throw new AppError(
        "Hospital accounts cannot create reimbursement requests as volunteers",
        403,
        "FORBIDDEN"
      );
    }

    const caseRecord = await caseService.getCaseForActor(input.caseId, actor);
    const hospital = await userService.ensureHospitalUser(input.hospitalId);
    const existingReimbursement = await fundingRepository.findActiveReimbursementByCaseId(input.caseId);

    if (existingReimbursement) {
      throw new AppError(
        "An active reimbursement request already exists for this case",
        409,
        "DUPLICATE_REIMBURSEMENT"
      );
    }

    const recentRequestCount = await userService.countRecentReimbursementRequests(
      actor.id,
      REIMBURSEMENT_LIMIT_DAYS
    );

    if (recentRequestCount >= MAX_ACTIVE_REIMBURSEMENTS_PER_WINDOW) {
      throw new AppError(
        "Reimbursement request limit reached for this user",
        429,
        "REIMBURSEMENT_RATE_LIMITED"
      );
    }

    if (caseRecord.assignedToUserId && caseRecord.assignedToUserId !== hospital.id) {
      throw new AppError(
        "This case is already linked to another service provider",
        409,
        "CASE_PROVIDER_MISMATCH"
      );
    }

    const reimbursement = await fundingRepository.createReimbursementRequest({
      caseId: input.caseId,
      volunteerId: actor.id,
      amountClaimed: input.amountClaimed,
      billUrl: input.billUrl,
      prescriptionUrl: input.prescriptionUrl,
      doctorName: input.doctorName,
      hospitalId: hospital.id
    });

    await caseService.appendEvidenceUrls(
      input.caseId,
      [input.billUrl, input.prescriptionUrl],
      actor
    );

    await notificationService.notifyUsers(
      [hospital.id, caseRecord.reporterUserId],
      "funding",
      "Reimbursement submitted",
      `A reimbursement request is awaiting hospital verification for case ${caseRecord.title}.`,
      {
        caseId: caseRecord.id,
        reimbursementId: reimbursement.id,
        volunteerId: actor.id
      }
    );

    return {
      reimbursement,
      verification: null,
      fundingCase: null,
      payout: null,
      caseRecord
    };
  }

  async verifyReimbursement(
    actor: AuthenticatedUser,
    input: ReimbursementVerifyInput
  ): Promise<ReimbursementDetail> {
    if (actor.role !== "hospital") {
      throw new AppError(
        "Only hospital accounts can verify reimbursements",
        403,
        "FORBIDDEN"
      );
    }

    const reimbursement = await fundingRepository.findReimbursementRequestById(input.reimbursementId);

    if (!reimbursement) {
      throw new AppError("Reimbursement request not found", 404, "REIMBURSEMENT_NOT_FOUND");
    }

    if (reimbursement.hospitalId !== actor.id) {
      throw new AppError(
        "This reimbursement request is assigned to a different hospital",
        403,
        "FORBIDDEN"
      );
    }

    const caseRecord = await caseService.getCaseById(reimbursement.caseId);

    const verifiedResult = await fundingRepository.verifyReimbursement({
      reimbursementId: reimbursement.id,
      hospitalId: actor.id,
      verified: input.verified,
      notes: input.notes
    });

    if (verifiedResult.reimbursement.status === "VERIFIED") {
      await notificationService.notifyUsers(
        [reimbursement.volunteerId, caseRecord.reporterUserId],
        "funding",
        "Reimbursement verified",
        `Hospital verification is complete for case ${caseRecord.title}. A reimbursement funding page is now live.`,
        {
          caseId: caseRecord.id,
          reimbursementId: reimbursement.id,
          fundingCaseId: verifiedResult.fundingCase?.id ?? null
        }
      );
    } else {
      await notificationService.notifyUsers(
        [reimbursement.volunteerId, caseRecord.reporterUserId],
        "funding",
        "Reimbursement rejected",
        `The reimbursement request for case ${caseRecord.title} was rejected by the hospital.`,
        {
          caseId: caseRecord.id,
          reimbursementId: reimbursement.id
        }
      );
    }

    return {
      reimbursement: verifiedResult.reimbursement,
      verification: verifiedResult.verification,
      fundingCase: verifiedResult.fundingCase,
      payout: verifiedResult.payout,
      caseRecord: await caseService.getCaseById(reimbursement.caseId)
    };
  }

  async getReimbursementById(
    actor: AuthenticatedUser,
    reimbursementId: string
  ): Promise<ReimbursementDetail> {
    const reimbursement = await fundingRepository.findReimbursementRequestById(reimbursementId);

    if (!reimbursement) {
      throw new AppError("Reimbursement request not found", 404, "REIMBURSEMENT_NOT_FOUND");
    }

    const caseRecord = await caseService.getCaseById(reimbursement.caseId);

    if (
      !["admin", "ngo", "govt"].includes(actor.role) &&
      actor.id !== reimbursement.volunteerId &&
      actor.id !== reimbursement.hospitalId &&
      actor.id !== caseRecord.reporterUserId &&
      actor.id !== caseRecord.assignedToUserId
    ) {
      throw new AppError("You do not have access to this reimbursement request", 403, "FORBIDDEN");
    }

    const [verification, fundingCase] = await Promise.all([
      fundingRepository.findHospitalVerificationByReimbursementId(reimbursementId),
      fundingRepository.findFundingCaseByCaseIdAndType(reimbursement.caseId, "REIMBURSEMENT")
    ]);

    const payout = fundingCase
      ? await fundingRepository.findPayoutByFundingCaseId(fundingCase.id)
      : null;

    return {
      reimbursement,
      verification,
      fundingCase,
      payout,
      caseRecord
    };
  }

  async releasePayout(
    actor: AuthenticatedUser,
    input: ReleasePayoutInput
  ): Promise<{ fundingCase: FundingCaseRecord; payout: PayoutRecord; caseRecord: CaseRecord }> {
    if (!["admin", "govt"].includes(actor.role)) {
      throw new AppError("Only platform authorities can release payouts", 403, "FORBIDDEN");
    }

    const existingFunding = await fundingRepository.findFundingCaseById(input.fundingCaseId);

    if (!existingFunding) {
      throw new AppError("Funding case not found", 404, "FUNDING_NOT_FOUND");
    }

    const releaseResult = await fundingRepository.releasePayout(input.fundingCaseId);

    if (!releaseResult) {
      throw new AppError("No payout is attached to this funding case", 404, "PAYOUT_NOT_FOUND");
    }

    const caseRecord = await caseService.getCaseById(existingFunding.caseId);

    await notificationService.notifyUsers(
      [releaseResult.payout.recipientId, caseRecord.reporterUserId],
      "funding",
      "Payout released",
      `A platform-controlled payout has been released for case ${caseRecord.title}.`,
      {
        caseId: caseRecord.id,
        fundingCaseId: releaseResult.fundingCase.id,
        payoutId: releaseResult.payout.id,
        recipientType: releaseResult.payout.recipientType
      }
    );

    return {
      fundingCase: releaseResult.fundingCase,
      payout: releaseResult.payout,
      caseRecord
    };
  }
}

export const fundingService = new FundingService();
