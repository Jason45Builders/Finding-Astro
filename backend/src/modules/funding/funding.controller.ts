import { Response } from "express";
import { AppError } from "../../middleware/error.middleware";
import { AuthenticatedRequest } from "../../types/global.types";
import { requiredParam } from "../../utils/express.utils";
import { sendCreated, sendSuccess } from "../../utils/response";
import { fundingService } from "./funding.service";

class FundingController {
  async createFunding(request: AuthenticatedRequest, response: Response): Promise<void> {
    const actor = request.user;

    if (!actor) {
      throw new AppError("Authentication is required", 401, "UNAUTHORIZED");
    }

    const funding = await fundingService.createFunding(actor, request.body);
    sendCreated(response, funding, "Funding page created");
  }

  async getFunding(request: AuthenticatedRequest, response: Response): Promise<void> {
    const actor = request.user;

    if (!actor) {
      throw new AppError("Authentication is required", 401, "UNAUTHORIZED");
    }

    const funding = await fundingService.getFundingById(actor, requiredParam(request.params, "id"));
    sendSuccess(response, funding, "Funding page loaded");
  }

  async donate(request: AuthenticatedRequest, response: Response): Promise<void> {
    const actor = request.user;

    if (!actor) {
      throw new AppError("Authentication is required", 401, "UNAUTHORIZED");
    }

    const donation = await fundingService.donate(actor, request.body);
    sendCreated(response, donation, "Donation processed");
  }

  async createReimbursementRequest(
    request: AuthenticatedRequest,
    response: Response
  ): Promise<void> {
    const actor = request.user;

    if (!actor) {
      throw new AppError("Authentication is required", 401, "UNAUTHORIZED");
    }

    const reimbursement = await fundingService.requestReimbursement(actor, request.body);
    sendCreated(response, reimbursement, "Reimbursement request created");
  }

  async verifyReimbursement(
    request: AuthenticatedRequest,
    response: Response
  ): Promise<void> {
    const actor = request.user;

    if (!actor) {
      throw new AppError("Authentication is required", 401, "UNAUTHORIZED");
    }

    const reimbursement = await fundingService.verifyReimbursement(actor, request.body);
    sendSuccess(response, reimbursement, "Reimbursement verification recorded");
  }

  async getReimbursement(request: AuthenticatedRequest, response: Response): Promise<void> {
    const actor = request.user;

    if (!actor) {
      throw new AppError("Authentication is required", 401, "UNAUTHORIZED");
    }

    const reimbursement = await fundingService.getReimbursementById(actor, requiredParam(request.params, "id"));
    sendSuccess(response, reimbursement, "Reimbursement request loaded");
  }

  async releasePayout(request: AuthenticatedRequest, response: Response): Promise<void> {
    const actor = request.user;

    if (!actor) {
      throw new AppError("Authentication is required", 401, "UNAUTHORIZED");
    }

    const payout = await fundingService.releasePayout(actor, request.body);
    sendSuccess(response, payout, "Payout released");
  }
}

export const fundingController = new FundingController();
