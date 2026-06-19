import { Router } from "express";
import { z } from "zod";
import { EducationAudience, AnimalStatus, CaseType } from "../../types/global.types";
import { validateQuery } from "../../middleware/validation.middleware";
import { asyncHandler, sendSuccess } from "../../utils/response";
import { legalService } from "./legal.service";

const router = Router();

const querySchema = z.object({
  audience: z.enum(["community", "volunteer", "hospital", "citizen"]).optional(),
  caseType: z.enum(["rescue", "abuse", "conflict", "lost_pet", "abc"]).optional(),
  animalStatus: z.enum(["community", "lost", "found", "reunited", "adopted"]).optional()
});

router.get(
  "/",
  validateQuery(querySchema),
  asyncHandler(async (request, response) => {
    const content = await legalService.getContent({
      audience: typeof request.query.audience === "string" ? request.query.audience as EducationAudience : undefined,
      caseType: typeof request.query.caseType === "string" ? request.query.caseType as CaseType : undefined,
      animalStatus:
        typeof request.query.animalStatus === "string" ? request.query.animalStatus as AnimalStatus : undefined
    });

    sendSuccess(response, content, "Legal content loaded");
  })
);

export default router;
