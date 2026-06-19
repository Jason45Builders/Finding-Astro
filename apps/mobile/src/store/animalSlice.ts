import { createSlice, PayloadAction } from "@reduxjs/toolkit";
import {
  Animal,
  AnimalSearchFilters,
  DuplicateCandidate,
  MatchSuggestion,
  Sighting
} from "../types/animal.types";

interface AnimalState {
  items: Animal[];
  selected: Animal | null;
  duplicates: DuplicateCandidate[];
  matches: MatchSuggestion[];
  sightings: Sighting[];
  filters: AnimalSearchFilters;
  loading: boolean;
  error: string | null;
}

const initialState: AnimalState = {
  items: [],
  selected: null,
  duplicates: [],
  matches: [],
  sightings: [],
  filters: {},
  loading: false,
  error: null
};

const animalSlice = createSlice({
  name: "animals",
  initialState,
  reducers: {
    setAnimals(state, action: PayloadAction<Animal[]>) {
      state.items = action.payload;
    },
    addAnimal(state, action: PayloadAction<Animal>) {
      state.items = [action.payload, ...state.items.filter((item) => item.id !== action.payload.id)];
      state.selected = action.payload;
    },
    setSelectedAnimal(state, action: PayloadAction<Animal | null>) {
      state.selected = action.payload;
    },
    setDuplicates(state, action: PayloadAction<DuplicateCandidate[]>) {
      state.duplicates = action.payload;
    },
    setMatches(state, action: PayloadAction<MatchSuggestion[]>) {
      state.matches = action.payload;
    },
    setSightings(state, action: PayloadAction<Sighting[]>) {
      state.sightings = action.payload;
    },
    setAnimalFilters(state, action: PayloadAction<AnimalSearchFilters>) {
      state.filters = action.payload;
    },
    setAnimalLoading(state, action: PayloadAction<boolean>) {
      state.loading = action.payload;
    },
    setAnimalError(state, action: PayloadAction<string | null>) {
      state.error = action.payload;
    }
  }
});

export const {
  setAnimals,
  addAnimal,
  setSelectedAnimal,
  setDuplicates,
  setMatches,
  setSightings,
  setAnimalFilters,
  setAnimalLoading,
  setAnimalError
} = animalSlice.actions;

export default animalSlice.reducer;
