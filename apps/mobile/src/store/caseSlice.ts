import { createSlice, PayloadAction } from "@reduxjs/toolkit";
import { AbcEvent, CaseRecord } from "../types/case.types";
import { NotificationItem, LegalContent } from "../types/user.types";

interface CaseState {
  items: CaseRecord[];
  abcEvents: AbcEvent[];
  notifications: NotificationItem[];
  legalContent: LegalContent | null;
  conflictActions: string[];
  loading: boolean;
  error: string | null;
}

const initialState: CaseState = {
  items: [],
  abcEvents: [],
  notifications: [],
  legalContent: null,
  conflictActions: [],
  loading: false,
  error: null
};

const caseSlice = createSlice({
  name: "cases",
  initialState,
  reducers: {
    setCases(state, action: PayloadAction<CaseRecord[]>) {
      state.items = action.payload;
    },
    addCase(state, action: PayloadAction<CaseRecord>) {
      state.items = [action.payload, ...state.items.filter((item) => item.id !== action.payload.id)];
    },
    setAbcEvents(state, action: PayloadAction<AbcEvent[]>) {
      state.abcEvents = action.payload;
    },
    setNotifications(state, action: PayloadAction<NotificationItem[]>) {
      state.notifications = action.payload;
    },
    setLegalContent(state, action: PayloadAction<LegalContent | null>) {
      state.legalContent = action.payload;
    },
    setConflictActions(state, action: PayloadAction<string[]>) {
      state.conflictActions = action.payload;
    },
    setCaseLoading(state, action: PayloadAction<boolean>) {
      state.loading = action.payload;
    },
    setCaseError(state, action: PayloadAction<string | null>) {
      state.error = action.payload;
    }
  }
});

export const {
  setCases,
  addCase,
  setAbcEvents,
  setNotifications,
  setLegalContent,
  setConflictActions,
  setCaseLoading,
  setCaseError
} = caseSlice.actions;

export default caseSlice.reducer;
