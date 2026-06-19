import { Response } from "express";
import { AppError } from "../../middleware/error.middleware";
import { AuthenticatedRequest } from "../../types/global.types";
import { requiredParam } from "../../utils/express.utils";
import { sendCreated, sendSuccess } from "../../utils/response";
import { animalService } from "./animal.service";

class AnimalController {
  async searchAnimals(request: AuthenticatedRequest, response: Response): Promise<void> {
    const animals = await animalService.searchAnimals({
      species: typeof request.query.species === "string" ? request.query.species : undefined,
      status: typeof request.query.status === "string" ? request.query.status : undefined,
      queryText: typeof request.query.queryText === "string" ? request.query.queryText : undefined,
      latitude:
        typeof request.query.latitude === "string" ? Number(request.query.latitude) : undefined,
      longitude:
        typeof request.query.longitude === "string" ? Number(request.query.longitude) : undefined,
      radiusKm:
        typeof request.query.radiusKm === "string" ? Number(request.query.radiusKm) : undefined,
      territoryLabel:
        typeof request.query.territoryLabel === "string"
          ? request.query.territoryLabel
          : undefined,
      needsAttention:
        typeof request.query.needsAttention === "string"
          ? request.query.needsAttention === "true"
          : undefined,
      limit: typeof request.query.limit === "string" ? Number(request.query.limit) : undefined
    });

    sendSuccess(response, animals, "Animals loaded", { count: animals.length });
  }

  async getTerritorySummary(_request: AuthenticatedRequest, response: Response): Promise<void> {
    const territories = await animalService.listTerritorySummary();
    sendSuccess(response, territories, "Territory summary loaded", { count: territories.length });
  }

  async getAnimalById(request: AuthenticatedRequest, response: Response): Promise<void> {
    const animal = await animalService.getAnimalById(requiredParam(request.params, "id"));
    sendSuccess(response, animal, "Animal loaded");
  }

  async getAnimalInsights(request: AuthenticatedRequest, response: Response): Promise<void> {
    const animal = await animalService.getAnimalInsights(requiredParam(request.params, "id"));
    sendSuccess(response, animal, "Animal insights loaded");
  }

  async createAnimal(request: AuthenticatedRequest, response: Response): Promise<void> {
    const userId = request.user?.id;

    if (!userId) {
      throw new AppError("Authentication is required", 401, "UNAUTHORIZED");
    }

    const result = await animalService.createAnimal({
      ...request.body,
      createdByUserId: userId
    });

    sendCreated(response, result, "Animal created");
  }

  async updateAnimal(request: AuthenticatedRequest, response: Response): Promise<void> {
    const animal = await animalService.updateAnimal(requiredParam(request.params, "id"), request.body);
    sendSuccess(response, animal, "Animal updated");
  }

  async reportSighting(request: AuthenticatedRequest, response: Response): Promise<void> {
    const userId = request.user?.id;

    if (!userId) {
      throw new AppError("Authentication is required", 401, "UNAUTHORIZED");
    }

    const sighting = await animalService.reportSighting({
      ...request.body,
      reporterUserId: userId
    });

    sendCreated(response, sighting, "Sighting reported");
  }

  async markSeenToday(request: AuthenticatedRequest, response: Response): Promise<void> {
    const userId = request.user?.id;

    if (!userId) {
      throw new AppError("Authentication is required", 401, "UNAUTHORIZED");
    }

    const result = await animalService.markSeenToday(requiredParam(request.params, "id"), {
      ...request.body,
      seenByUserId: userId
    });

    sendCreated(response, result, "Presence logged");
  }

  async addVaccinationRecord(request: AuthenticatedRequest, response: Response): Promise<void> {
    const userId = request.user?.id;

    if (!userId) {
      throw new AppError("Authentication is required", 401, "UNAUTHORIZED");
    }

    const vaccination = await animalService.addVaccinationRecord(userId, {
      ...request.body,
      animalId: requiredParam(request.params, "id"),
      administeredAt: new Date(request.body.administeredAt),
      expiresAt: request.body.expiresAt ? new Date(request.body.expiresAt) : null
    });

    sendCreated(response, vaccination, "Vaccination recorded");
  }

  async addMedicalHistoryEntry(request: AuthenticatedRequest, response: Response): Promise<void> {
    const userId = request.user?.id;

    if (!userId) {
      throw new AppError("Authentication is required", 401, "UNAUTHORIZED");
    }

    const entry = await animalService.addMedicalHistoryEntry(userId, {
      ...request.body,
      animalId: requiredParam(request.params, "id"),
      treatmentDate: new Date(request.body.treatmentDate)
    });

    sendCreated(response, entry, "Medical history updated");
  }

  async listSightings(request: AuthenticatedRequest, response: Response): Promise<void> {
    const sightings = await animalService.listSightings(
      typeof request.query.animalId === "string" ? request.query.animalId : undefined
    );

    sendSuccess(response, sightings, "Sightings loaded", { count: sightings.length });
  }
}

export const animalController = new AnimalController();
