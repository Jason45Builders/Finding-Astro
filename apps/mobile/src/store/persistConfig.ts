import AsyncStorage from "@react-native-async-storage/async-storage";
import { persistReducer, persistStore } from "redux-persist";
import { combineReducers } from "@reduxjs/toolkit";

import animalReducer from "./animalSlice";
import authReducer from "./authSlice";
import caseReducer from "./caseSlice";

const persistConfig = {
  key: "findingastro-root",
  storage: AsyncStorage,
  blacklist: ["auth.session"], // keep token in separate secure storage in future; for now blacklist
  whitelist: ["animals", "cases"], // persist animals and cases for offline use
  version: 1,
};

const rootReducer = combineReducers({
  auth: authReducer,
  animals: animalReducer,
  cases: caseReducer,
});

export const persistedReducer = persistReducer(persistConfig, rootReducer);
export { persistStore };
