import { AppError } from "../../middleware/error.middleware";
import {
  AnimalInsightRecord,
  AnimalRecord,
  CaseRecord,
  DuplicateCandidate,
  MatchSuggestion,
  MedicalHistoryRecord,
  SightingRecord,
  VaccinationRecord,
  VaccinationStatus,
  VisualSignature
} from "../../types/global.types";
import { clamp } from "../../utils/geo.utils";
import { legalService } from "../legal/legal.service";
import { notificationService } from "../notifications/notification.service";
import { userService } from "../users/user.service";
import {
  animalRepository,
  AnimalMutationInput,
  AnimalSearchFilters,
  AnimalUpdateInput,
  MedicalHistoryInput,
  PresenceLogInput,
  SightingInput,
  VaccinationInput
} from "./animal.repository";

const tokenize = (value: string | null | undefined): string[] =>
  (value ?? "")
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter(Boolean);

const overlapScore = (source: string[] | string | null | undefined, candidate: string[] | string | null | undefined): number => {
  const sourceTokens = Array.isArray(source) ? source : tokenize(source);
  const candidateTokens = Array.isArray(candidate) ? candidate : tokenize(candidate);
  if (!sourceTokens.length || !candidateTokens.length) return 0;
  const matches = sourceTokens.filter((token) => candidateTokens.includes(token)).length;
  return matches > 0 ? Math.min(18, matches * 6) : 0;
};

const territoryForLocation = (latitude: number, longitude: number): string =>
  `T-${Math.floor(latitude * 100)}-${Math.floor(longitude * 100)}`;

const buildVisualSignature = (
  input: Pick<AnimalMutationInput | AnimalUpdateInput, "species" | "color" | "breed" | "distinguishingMarks" | "photoUrls" | "primaryPhotoUrl">
): VisualSignature => ({
  speciesToken: (input.species ?? "").toLowerCase(),
  colorTokens: tokenize(input.color),
  breedTokens: tokenize(input.breed),
  distinguishingTokens: tokenize(input.distinguishingMarks),
  photoFingerprint: `${input.primaryPhotoUrl ?? ""}|${(input.photoUrls ?? []).join("|")}`
});

const determineDisappearanceRisk = (
  lastSeenAt: Date | null,
  status: AnimalRecord["status"]
): AnimalRecord["disappearanceRiskLevel"] => {
  if (status === "lost" || !lastSeenAt) return "urgent";
  const elapsedHours = (Date.now() - lastSeenAt.getTime()) / (1000 * 60 * 60);
  if (elapsedHours >= 24 * 14) return "urgent";
  if (elapsedHours >= 24 * 5) return "watch";
  return "stable";
};

const mapActiveCase = (caseRow: {
  id: string; animal_id: string | null; reporter_user_id: string; assigned_to_user_id: string | null;
  case_type: CaseRecord["caseType"]; status: CaseRecord["status"]; priority: string; title: string;
  description: string; location_text: string | null; latitude: number; longitude: number;
  evidence_urls: string[] | null; resolution_notes: string | null; created_at: Date; updated_at: Date;
}): CaseRecord => ({
  id: caseRow.id, animalId: caseRow.animal_id, reporterUserId: caseRow.reporter_user_id,
  assignedToUserId: caseRow.assigned_to_user_id, caseType: caseRow.case_type, status: caseRow.status,
  priority: caseRow.priority, title: caseRow.title, description: caseRow.description,
  locationText: caseRow.location_text,
  location: { latitude: Number(caseRow.latitude), longitude: Number(caseRow.longitude) },
  evidenceUrls: caseRow.evidence_urls ?? [], resolutionNotes: caseRow.resolution_notes,
  createdAt: caseRow.created_at, updatedAt: caseRow.updated_at
});

const buildDuplicateCandidate = (input: AnimalMutationInput | AnimalUpdateInput, candidate: AnimalRecord): DuplicateCandidate => {
  const distanceScore = candidate.distanceKm !== undefined ? Math.max(0, 42 - candidate.distanceKm * 16) : 18;
  const speciesScore = input.species && input.species.toLowerCase() === candidate.species.toLowerCase() ? 24 : 0;
  const colorScore = overlapScore(input.color, candidate.color);
  const breedScore = overlapScore(input.breed, candidate.breed);
  const territoryScore = input.location && territoryForLocation(input.location.latitude, input.location.longitude) === candidate.territoryLabel ? 10 : 0;
  const visualScore = overlapScore(tokenize(input.distinguishingMarks), candidate.visualSignature.distinguishingTokens);
  const confidence = clamp(Math.round(distanceScore + speciesScore + colorScore + breedScore + territoryScore + visualScore), 1, 99);
  return {
    animal: candidate, confidence,
    reason: confidence >= 78
      ? "High-confidence duplicate based on territory, profile overlap, and recent presence."
      : "Potential duplicate based on nearby location, matching profile traits, or territory overlap."
  };
};

class AnimalService {
  // FIXED: refreshDisappearanceStates() calls REMOVED.
  // Disappearance risk is now updated by pg_cron every 15 minutes (003_cron_and_indexes.sql).
  // Calling it on every read was a full-table write causing database lock contention.

  async createAnimal(input: AnimalMutationInput): Promise<{ animal: AnimalRecord; duplicates: DuplicateCandidate[] }> {
    const territoryLabel = territoryForLocation(input.location.latitude, input.location.longitude);
    const visualSignature = buildVisualSignature({ species: input.species, color: input.color, breed: input.breed, distinguishingMarks: input.distinguishingMarks, photoUrls: input.photoUrls, primaryPhotoUrl: input.primaryPhotoUrl });
    const lastSeenAt = input.lastSeenAt ?? new Date();
    const lastConfirmedAliveAt = input.status === "lost" ? null : input.lastConfirmedAliveAt ?? lastSeenAt;
    const duplicateAnimals = await animalRepository.findPotentialDuplicates({ species: input.species, color: input.color, breed: input.breed, location: input.location, territoryLabel });
    const animal = await animalRepository.create({ ...input, territoryLabel, visualSignature, lastSeenAt, lastConfirmedAliveAt, seenTodayCount: input.status === "lost" ? 0 : 1, disappearanceRiskLevel: input.status === "lost" ? "urgent" : determineDisappearanceRisk(lastSeenAt, input.status ?? "community") });

    if (animal.createdByUserId && animal.status !== "lost") {
      await animalRepository.logPresence({ animalId: animal.id, seenByUserId: animal.createdByUserId, source: "creation", observationNotes: animal.lastSeenText ?? "Initial animal record created.", territoryLabel, location: animal.location, seenAt: lastSeenAt });
      await userService.touchUserActivity(animal.createdByUserId);
    }

    const duplicates = duplicateAnimals.map((candidate) => buildDuplicateCandidate(input, candidate));
    if (duplicates.length && animal.createdByUserId) {
      await notificationService.notifyUser(animal.createdByUserId, "animal", "Possible duplicate detected", `We found ${duplicates.length} nearby animal record(s) that may match ${animal.name ?? animal.species}.`, { animalId: animal.id, duplicates: duplicates.map((item) => item.animal.id) });
    }

    if (animal.status === "lost" && animal.createdByUserId) {
      await notificationService.notifyUsersNearLocation(animal.location, 5, [animal.createdByUserId], "animal", "Lost pet alert", `${animal.name ?? animal.species} has been marked lost near ${animal.lastSeenText ?? "the last recorded location"}.`, { animalId: animal.id, territoryLabel: animal.territoryLabel }, { fuzzyBroadcast: true });
    }

    return { animal, duplicates };
  }

  async updateAnimal(animalId: string, input: AnimalUpdateInput): Promise<{ animal: AnimalRecord; duplicates: DuplicateCandidate[] }> {
    const currentAnimal = await animalRepository.findById(animalId);
    if (!currentAnimal) throw new AppError("Animal not found", 404, "ANIMAL_NOT_FOUND");

    const mergedLocation = input.location ?? currentAnimal.location;
    const mergedSpecies = input.species ?? currentAnimal.species;
    const mergedTerritoryLabel = input.territoryLabel ?? territoryForLocation(mergedLocation.latitude, mergedLocation.longitude);
    const visualSignature = buildVisualSignature({ species: mergedSpecies, color: input.color ?? currentAnimal.color ?? undefined, breed: input.breed ?? currentAnimal.breed ?? undefined, distinguishingMarks: input.distinguishingMarks ?? currentAnimal.distinguishingMarks ?? undefined, photoUrls: input.photoUrls ?? currentAnimal.photoUrls, primaryPhotoUrl: input.primaryPhotoUrl ?? currentAnimal.primaryPhotoUrl });
    const duplicates = await animalRepository.findPotentialDuplicates({ species: mergedSpecies, color: input.color ?? currentAnimal.color ?? undefined, breed: input.breed ?? currentAnimal.breed ?? undefined, location: mergedLocation, territoryLabel: mergedTerritoryLabel }, animalId);
    const updatedAnimal = await animalRepository.update(animalId, { ...input, territoryLabel: mergedTerritoryLabel, visualSignature, lastSeenAt: input.lastSeenAt ?? currentAnimal.lastSeenAt, lastConfirmedAliveAt: input.status === "lost" ? currentAnimal.lastConfirmedAliveAt : input.lastConfirmedAliveAt ?? currentAnimal.lastConfirmedAliveAt ?? new Date(), disappearanceRiskLevel: determineDisappearanceRisk(input.lastSeenAt ?? currentAnimal.lastSeenAt, input.status ?? currentAnimal.status) });

    if (!updatedAnimal) throw new AppError("Animal not found", 404, "ANIMAL_NOT_FOUND");
    return { animal: updatedAnimal, duplicates: duplicates.map((candidate) => buildDuplicateCandidate({ species: mergedSpecies, color: input.color ?? currentAnimal.color ?? undefined, breed: input.breed ?? currentAnimal.breed ?? undefined, distinguishingMarks: input.distinguishingMarks ?? currentAnimal.distinguishingMarks ?? undefined, location: mergedLocation, territoryLabel: mergedTerritoryLabel }, candidate)) };
  }

  async getAnimalById(animalId: string): Promise<AnimalRecord> {
    const animal = await animalRepository.findById(animalId);
    if (!animal) throw new AppError("Animal not found", 404, "ANIMAL_NOT_FOUND");
    return animal;
  }

  async getAnimalInsights(animalId: string): Promise<AnimalInsightRecord> {
    const animal = await this.getAnimalById(animalId);
    const [sightings, vaccinationRecords, medicalHistory, recentPresence, activeCaseRows, abuseFlags] = await Promise.all([animalRepository.listSightings(animalId), animalRepository.listVaccinationRecords(animalId), animalRepository.listMedicalHistory(animalId), animalRepository.listPresenceLogs(animalId), animalRepository.listActiveCasesForAnimal(animalId), animalRepository.listAbuseFlagsForAnimal(animalId)]);
    return { animal, sightings, vaccinationRecords, medicalHistory, recentPresence, activeCases: activeCaseRows.map(mapActiveCase), abuseFlags, educationModules: await legalService.getEducationModules({ animalStatus: animal.status }) };
  }

  async searchAnimals(filters: AnimalSearchFilters): Promise<AnimalRecord[]> {
    return animalRepository.search(filters);
  }

  async reportSighting(input: SightingInput): Promise<SightingRecord> {
    const sighting = await animalRepository.createSighting(input);
    const targetAnimalId = input.matchedAnimalId ?? input.animalId ?? null;
    if (targetAnimalId) {
      const matchedAnimal = await animalRepository.findById(targetAnimalId);
      const notifyUserId = matchedAnimal?.caretakerUserId ?? matchedAnimal?.createdByUserId;
      if (matchedAnimal) { await animalRepository.logPresence({ animalId: matchedAnimal.id, seenByUserId: input.reporterUserId, source: "sighting", observationNotes: input.description, territoryLabel: territoryForLocation(input.location.latitude, input.location.longitude), location: input.location }); }
      if (notifyUserId) { await notificationService.notifyUser(notifyUserId, "animal", "New sighting reported", `A possible sighting has been reported for ${matchedAnimal?.name ?? matchedAnimal?.species}.`, { sightingId: sighting.id, animalId: targetAnimalId }); }
      if (matchedAnimal?.status === "lost") { await notificationService.notifyUsersNearLocation(input.location, 3, [input.reporterUserId], "animal", "Possible lost pet match nearby", `A sighting near you may relate to ${matchedAnimal.name ?? matchedAnimal.species}.`, { sightingId: sighting.id, animalId: matchedAnimal.id }, { fuzzyBroadcast: true }); }
    }
    await userService.touchUserActivity(input.reporterUserId);
    return sighting;
  }

  async markSeenToday(animalId: string, input: Omit<PresenceLogInput, "animalId">): Promise<{ animal: AnimalRecord; presence: MatchSuggestion | null }> {
    const animal = await this.getAnimalById(animalId);
    const presence = await animalRepository.logPresence({ ...input, animalId, territoryLabel: input.territoryLabel ?? territoryForLocation(input.location.latitude, input.location.longitude) });
    const refreshedAnimal = await this.getAnimalById(animalId);
    if (animal.disappearanceRiskLevel !== "stable") {
      const notifyUserId = animal.caretakerUserId ?? animal.createdByUserId;
      if (notifyUserId) { await notificationService.notifyUser(notifyUserId, "animal", "Seen today update received", `${animal.name ?? animal.species} has a new field confirmation and the disappearance alert has been reduced.`, { animalId: animal.id, seenAt: presence.seenAt.toISOString() }); }
    }
    await userService.recordVolunteerActivity(input.seenByUserId, "animal_seen_today", animalId, 1, presence.observationNotes ?? "Animal presence confirmed.");
    return { animal: refreshedAnimal, presence: { type: "animal", referenceId: presence.id, title: `${refreshedAnimal.name ?? refreshedAnimal.species} seen today`, summary: presence.observationNotes ?? "Field confirmation recorded.", confidence: 100, distanceKm: 0, coordinates: presence.location, photoUrl: refreshedAnimal.primaryPhotoUrl, signal: "recent_presence", territoryLabel: presence.territoryLabel } };
  }

  async addVaccinationRecord(actorId: string, input: Omit<VaccinationInput, "administeredByUserId" | "status">): Promise<VaccinationRecord> {
    const status: VaccinationStatus = input.expiresAt && input.expiresAt.getTime() < Date.now() ? "expired" : input.verified ? "verified" : "unverified";
    const vaccination = await animalRepository.addVaccinationRecord({ ...input, administeredByUserId: actorId, status });
    const medicalEntry: MedicalHistoryRecord = await animalRepository.addMedicalHistoryEntry({ animalId: input.animalId, caseId: input.caseId ?? null, createdByUserId: actorId, entryType: "vaccination", title: `${input.vaccineName} vaccination`, notes: input.notes ?? null, providerName: null, treatmentDate: input.administeredAt, attachments: [] });
    const animal = await this.getAnimalById(input.animalId);
    const notifyUserId = animal.caretakerUserId ?? animal.createdByUserId;
    if (notifyUserId) { await notificationService.notifyUser(notifyUserId, "medical", "Vaccination record added", `${animal.name ?? animal.species} now has a ${input.vaccineName} record with status ${vaccination.status}.`, { animalId: animal.id, vaccinationId: vaccination.id, medicalEntryId: medicalEntry.id }); }
    await userService.recordVolunteerActivity(actorId, "vaccination_logged", vaccination.id, vaccination.verified ? 3 : 1, `${input.vaccineName} recorded for ${animal.name ?? animal.species}.`);
    return vaccination;
  }

  async addMedicalHistoryEntry(actorId: string, input: Omit<MedicalHistoryInput, "createdByUserId">): Promise<MedicalHistoryRecord> {
    const entry = await animalRepository.addMedicalHistoryEntry({ ...input, createdByUserId: actorId });
    const animal = await this.getAnimalById(input.animalId);
    const notifyUserId = animal.caretakerUserId ?? animal.createdByUserId;
    if (notifyUserId) { await notificationService.notifyUser(notifyUserId, "medical", "Medical timeline updated", `${animal.name ?? animal.species} has a new ${entry.entryType} entry: ${entry.title}.`, { animalId: animal.id, entryId: entry.id, caseId: entry.caseId }); }
    await userService.recordVolunteerActivity(actorId, "medical_entry_logged", entry.id, 2, entry.title);
    return entry;
  }

  async listSightings(animalId?: string): Promise<SightingRecord[]> { return animalRepository.listSightings(animalId); }

  async listTerritorySummary(): Promise<Array<{ territoryLabel: string; animalCount: number; urgentCount: number; seenTodayCount: number }>> {
    return animalRepository.listTerritorySummary();
  }
}

export const animalService = new AnimalService();
