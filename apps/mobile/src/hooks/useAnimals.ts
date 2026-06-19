import { useCallback } from "react";
import { aiService } from "../services/ai.service";
import { animalService } from "../services/animal.service";
import {
  addAnimal,
  setAnimalError,
  setAnimalFilters,
  setAnimalLoading,
  setAnimals,
  setDuplicates,
  setMatches,
  setSelectedAnimal,
  setSightings
} from "../store/animalSlice";
import { useAppDispatch, useAppSelector } from "../store";
import { AnimalFormValues, AnimalSearchFilters } from "../types/animal.types";

export const useAnimals = () => {
  const dispatch = useAppDispatch();
  const animalState = useAppSelector((state) => state.animals);
  const token = useAppSelector((state) => state.auth.session?.token);

  const searchAnimals = useCallback(
    async (filters: AnimalSearchFilters) => {
      dispatch(setAnimalLoading(true));
      dispatch(setAnimalFilters(filters));

      try {
        const animals = await animalService.listAnimals(filters);
        dispatch(setAnimals(animals));
        dispatch(setAnimalError(null));
        return animals;
      } catch (error) {
        const message = error instanceof Error ? error.message : "Unable to load animals.";
        dispatch(setAnimalError(message));
        throw error;
      } finally {
        dispatch(setAnimalLoading(false));
      }
    },
    [dispatch]
  );

  const loadAnimalById = useCallback(
    async (animalId: string) => {
      dispatch(setAnimalLoading(true));

      try {
        const animal = await animalService.getAnimalById(animalId);
        dispatch(setSelectedAnimal(animal));
        dispatch(setAnimalError(null));
        return animal;
      } catch (error) {
        const message = error instanceof Error ? error.message : "Unable to load animal.";
        dispatch(setAnimalError(message));
        throw error;
      } finally {
        dispatch(setAnimalLoading(false));
      }
    },
    [dispatch]
  );

  const createAnimal = useCallback(
    async (payload: AnimalFormValues) => {
      if (!token) {
        throw new Error("You must be logged in to create an animal record.");
      }

      dispatch(setAnimalLoading(true));

      try {
        const result = await animalService.createAnimal(token, payload);
        dispatch(addAnimal(result.animal));
        dispatch(setDuplicates(result.duplicates));
        dispatch(setAnimalError(null));
        return result;
      } catch (error) {
        const message = error instanceof Error ? error.message : "Unable to create animal.";
        dispatch(setAnimalError(message));
        throw error;
      } finally {
        dispatch(setAnimalLoading(false));
      }
    },
    [dispatch, token]
  );

  const reportSighting = useCallback(
    async (payload: Parameters<typeof animalService.reportSighting>[1]) => {
      if (!token) {
        throw new Error("You must be logged in to report a sighting.");
      }

      dispatch(setAnimalLoading(true));

      try {
        const sighting = await animalService.reportSighting(token, payload);
        const sightings = await animalService.listSightings(payload.matchedAnimalId ?? payload.animalId ?? undefined);
        dispatch(setSightings(sightings));
        dispatch(setAnimalError(null));
        return sighting;
      } catch (error) {
        const message = error instanceof Error ? error.message : "Unable to report sighting.";
        dispatch(setAnimalError(message));
        throw error;
      } finally {
        dispatch(setAnimalLoading(false));
      }
    },
    [dispatch, token]
  );

  const loadMatches = useCallback(
    async (payload: Parameters<typeof aiService.getMatchSuggestions>[1]) => {
      if (!token) {
        throw new Error("You must be logged in to fetch match suggestions.");
      }

      dispatch(setAnimalLoading(true));

      try {
        const matches = await aiService.getMatchSuggestions(token, payload);
        dispatch(setMatches(matches));
        dispatch(setAnimalError(null));
        return matches;
      } catch (error) {
        const message = error instanceof Error ? error.message : "Unable to fetch match suggestions.";
        dispatch(setAnimalError(message));
        throw error;
      } finally {
        dispatch(setAnimalLoading(false));
      }
    },
    [dispatch, token]
  );

  return {
    ...animalState,
    searchAnimals,
    loadAnimalById,
    createAnimal,
    reportSighting,
    loadMatches
  };
};
