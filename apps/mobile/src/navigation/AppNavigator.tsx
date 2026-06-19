import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { DuplicateCandidate, MatchSuggestion } from "../types/animal.types";
import AddAnimalScreen       from "../screens/AddAnimalScreen";
import AnimalProfileScreen   from "../screens/AnimalProfileScreen";
import ConflictScreen        from "../screens/ConflictScreen";
import HomeMapScreen         from "../screens/HomeMapScreen";
import LegalHubScreen        from "../screens/LegalHubScreen";
import LostPetScreen         from "../screens/LostPetScreen";
import MatchResultsScreen    from "../screens/MatchResultsScreen";
import NotificationsScreen   from "../screens/NotificationsScreen";
import ReportCaseScreen      from "../screens/ReportCaseScreen";
import EmergencyReportScreen from "../screens/EmergencyReportScreen";
import EmergencyResponderScreen from "../screens/EmergencyResponderScreen";
import CaseSubmittedScreen   from "../screens/CaseSubmittedScreen";
import WildlifeScreen        from "../screens/WildlifeScreen";   // FIXED: was missing

export type AppStackParamList = {
  HomeMap:            undefined;
  AddAnimal:          undefined;
  AnimalProfile:      { animalId: string };
  ReportCase:         { animalId?: string } | undefined;
  EmergencyReport:    undefined;
  EmergencyResponder: { caseId: string; caseTitle: string; latitude: number; longitude: number };
  CaseSubmitted:      { caseId: string; notifiedCount: number; priority: string };
  LostPet:            undefined;
  MatchResults: {
    title?: string;
    matches?: MatchSuggestion[];
    duplicates?: DuplicateCandidate[];
  };
  Wildlife:      undefined;   // FIXED: was missing from param list
  Conflict:      undefined;
  LegalHub:      undefined;
  Notifications: undefined;
};

const Stack = createNativeStackNavigator<AppStackParamList>();

const AppNavigator = () => (
  <Stack.Navigator
    initialRouteName="HomeMap"
    screenOptions={{
      headerBackTitleVisible: false,
      headerStyle: { backgroundColor: "#F5F1E8" },
      headerTintColor: "#2E2A24",
      headerShadowVisible: false,
    }}
  >
    <Stack.Screen name="HomeMap"            component={HomeMapScreen}            options={{ title: "Finding Astro" }} />
    <Stack.Screen name="EmergencyReport"    component={EmergencyReportScreen}    options={{ title: "Animal Emergency", headerStyle: { backgroundColor: "#FDEAEA" }, headerTintColor: "#B83232" }} />
    <Stack.Screen name="EmergencyResponder" component={EmergencyResponderScreen} options={{ title: "Responder" }} />
    <Stack.Screen name="CaseSubmitted"      component={CaseSubmittedScreen}      options={{ title: "Report Sent", headerBackVisible: false }} />
    <Stack.Screen name="Wildlife"           component={WildlifeScreen}           options={{ title: "Wildlife Rescue", headerStyle: { backgroundColor: "#F0E8FA" }, headerTintColor: "#6B3FA0" }} />
    <Stack.Screen name="AddAnimal"          component={AddAnimalScreen}          options={{ title: "Add Animal" }} />
    <Stack.Screen name="AnimalProfile"      component={AnimalProfileScreen}      options={{ title: "Animal Profile" }} />
    <Stack.Screen name="ReportCase"         component={ReportCaseScreen}         options={{ title: "Report Case" }} />
    <Stack.Screen name="LostPet"            component={LostPetScreen}            options={{ title: "Lost & Found" }} />
    <Stack.Screen name="MatchResults"       component={MatchResultsScreen}       options={{ title: "Match Results" }} />
    <Stack.Screen name="Conflict"           component={ConflictScreen}           options={{ title: "Conflict Support" }} />
    <Stack.Screen name="LegalHub"           component={LegalHubScreen}           options={{ title: "Legal Hub" }} />
    <Stack.Screen name="Notifications"      component={NotificationsScreen}      options={{ title: "Notifications" }} />
  </Stack.Navigator>
);

export default AppNavigator;
