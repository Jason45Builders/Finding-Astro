import { configureStore } from "@reduxjs/toolkit";
import { TypedUseSelectorHook, useDispatch, useSelector } from "react-redux";
import animalReducer from "./animalSlice";
import authReducer from "./authSlice";
import caseReducer from "./caseSlice";

export const store = configureStore({
  reducer: {
    auth: authReducer,
    animals: animalReducer,
    cases: caseReducer
  }
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;

export const useAppDispatch = (): AppDispatch => useDispatch<AppDispatch>();
export const useAppSelector: TypedUseSelectorHook<RootState> = useSelector;
