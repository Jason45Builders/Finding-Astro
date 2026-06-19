import * as Linking from "expo-linking";
import { NavigationContainerRef } from "@react-navigation/native";
import { AppStackParamList } from "../navigation/AppNavigator";
import { apiRequest } from "./api";

let navigationRef: NavigationContainerRef<AppStackParamList> | null = null;

export const setNavigationRef = (ref: NavigationContainerRef<AppStackParamList> | null) => {
  navigationRef = ref;
};

export const handleDeepLink = async (url: string) => {
  const { hostname, path, queryParams } = Linking.parse(url);

  if (!path) return;

  const pathParts = path.split("/").filter(Boolean);

  // findingastro://qr/:code
  if (pathParts[0] === "qr" && pathParts[1]) {
    const code = pathParts[1];
    try {
      const result = await apiRequest<{ type: "animal" | "zone"; id: string }>(`/qr/scan/${code}`, {
        method: "POST",
      });
      if (result.type === "animal") {
        navigationRef?.navigate("AnimalProfile", { animalId: result.id });
      }
    } catch {
      // QR invalid or network error — could show a toast
    }
    return;
  }

  // findingastro://case/:id
  if (pathParts[0] === "case" && pathParts[1]) {
    const caseId = pathParts[1];
    navigationRef?.navigate("EmergencyResponder", {
      caseId,
      caseTitle: "Case detail",
      latitude: 0,
      longitude: 0,
    });
    return;
  }

  // findingastro://emergency
  if (pathParts[0] === "emergency") {
    navigationRef?.navigate("EmergencyReport");
    return;
  }

  // findingastro://animal/:id
  if (pathParts[0] === "animal" && pathParts[1]) {
    navigationRef?.navigate("AnimalProfile", { animalId: pathParts[1] });
    return;
  }

  // Universal link fallback
  if (hostname === "findingastro.app" || hostname === "www.findingastro.app") {
    if (pathParts[0] === "animal" && pathParts[1]) {
      navigationRef?.navigate("AnimalProfile", { animalId: pathParts[1] });
    }
  }
};

export const getInitialURL = async (): Promise<string | null> => {
  return Linking.getInitialURL();
};

export const addLinkingListener = (handler: (url: string) => void) => {
  return Linking.addEventListener("url", (event) => {
    if (event.url) handler(event.url);
  });
};
