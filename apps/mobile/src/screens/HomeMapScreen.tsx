/**
 * HomeMapScreen.tsx — FIX 8
 * Adds prominent SOS emergency button at the TOP of the home screen.
 * Impossible to miss. One tap → EmergencyReport screen.
 * Everything else remains intact below it.
 */

import { useEffect, useState } from "react";
import {
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useAuth } from "../hooks/useAuth";
import { useAnimals } from "../hooks/useAnimals";
import { useLocation } from "../hooks/useLocation";
import { AppStackParamList } from "../navigation/AppNavigator";
import { colors } from "../theme/colors";
import { typography } from "../theme/typography";
import { formatDistance } from "../utils/geo";

type Props = NativeStackScreenProps<AppStackParamList, "HomeMap">;

const HomeMapScreen = ({ navigation }: Props) => {
  const { session, logout } = useAuth();
  const { items, loading, searchAnimals } = useAnimals();
  const { currentLocation, error: locationError, refresh } = useLocation();
  const [queryText, setQueryText] = useState("");

  useEffect(() => {
    void searchAnimals({
      latitude:  currentLocation.latitude,
      longitude: currentLocation.longitude,
      radiusKm:  5,
      limit:     20,
    });
  }, [currentLocation.latitude, currentLocation.longitude, searchAnimals]);

  const refreshNearby = async () => {
    const coords = await refresh();
    await searchAnimals({
      latitude:  coords.latitude,
      longitude: coords.longitude,
      radiusKm:  5,
      queryText,
      limit:     20,
    });
  };

  const runSearch = async () => {
    await searchAnimals({
      latitude:  currentLocation.latitude,
      longitude: currentLocation.longitude,
      radiusKm:  8,
      queryText,
      limit:     20,
    });
  };

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={loading} onRefresh={refreshNearby} />}
    >
      {/* ── FIX 8: SOS EMERGENCY BUTTON — first thing the user sees ─────────── */}
      <Pressable
        style={styles.sosButton}
        onPress={() => navigation.navigate("EmergencyReport")}
        android_ripple={{ color: "#ffffff30" }}
      >
        <View style={styles.sosInner}>
          <Text style={styles.sosIcon}>🚨</Text>
          <View style={styles.sosText}>
            <Text style={styles.sosTitle}>Injured animal nearby?</Text>
            <Text style={styles.sosSub}>Tap to report — alerts responders instantly</Text>
          </View>
          <Text style={styles.sosArrow}>›</Text>
        </View>
      </Pressable>

      {/* Hero */}
      <View style={styles.hero}>
        <View>
          <Text style={styles.greeting}>Welcome, {session?.user.fullName ?? "friend"}</Text>
          <Text style={styles.heroTitle}>Community animal map</Text>
        </View>
        <Pressable onPress={() => void logout()}>
          <Text style={styles.logout}>Logout</Text>
        </Pressable>
      </View>

      {/* Location card */}
      <View style={styles.mapCard}>
        <Text style={styles.cardTitle}>Nearby search zone</Text>
        <Text style={styles.cardText}>
          {currentLocation.latitude.toFixed(4)}, {currentLocation.longitude.toFixed(4)}
        </Text>
        {locationError ? <Text style={styles.warning}>{locationError}</Text> : null}
      </View>

      {/* Search */}
      <View style={styles.searchRow}>
        <TextInput
          value={queryText}
          onChangeText={setQueryText}
          placeholder="Search species, colour, or name"
          placeholderTextColor={colors.textSecondary}
          style={styles.searchInput}
        />
        <Pressable style={styles.searchButton} onPress={() => void runSearch()}>
          <Text style={styles.searchButtonText}>Search</Text>
        </Pressable>
      </View>

      {/* Quick actions — emergency no longer lives here; it has its own SOS button above */}
      <View style={styles.quickActions}>
        {[
          { label: "Add Animal",  route: "AddAnimal"   as const },
          { label: "Report Case", route: "ReportCase"  as const },
          { label: "Lost & Found",route: "LostPet"     as const },
          { label: "Conflict",    route: "Conflict"    as const },
          { label: "Legal",       route: "LegalHub"    as const },
          { label: "Alerts",      route: "Notifications" as const },
        ].map((item) => (
          <Pressable
            key={item.label}
            style={styles.actionCard}
            onPress={() => navigation.navigate(item.route)}
          >
            <Text style={styles.actionText}>{item.label}</Text>
          </Pressable>
        ))}
      </View>

      <Text style={styles.sectionTitle}>Animals around you</Text>

      {items.map((animal) => (
        <Pressable
          key={animal.id}
          style={styles.animalCard}
          onPress={() => navigation.navigate("AnimalProfile", { animalId: animal.id })}
        >
          <View style={styles.animalCardHeader}>
            <Text style={styles.animalName}>{animal.name ?? animal.species}</Text>
            <Text style={styles.statusPill}>{animal.status}</Text>
          </View>
          <Text style={styles.cardText}>
            {animal.species}{animal.breed ? ` • ${animal.breed}` : ""}
          </Text>
          <Text style={styles.cardText}>{animal.lastSeenText ?? "Recent community record"}</Text>
          <Text style={styles.distance}>{formatDistance(animal.distanceKm)}</Text>
        </Pressable>
      ))}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  content: { padding: 18, gap: 14 },

  /* FIX 8 — SOS button */
  sosButton: {
    backgroundColor: "#B83232",
    borderRadius: 20,
    shadowColor: "#B83232",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 10,
    elevation: 8,
  },
  sosInner: {
    flexDirection: "row",
    alignItems: "center",
    padding: 18,
    gap: 12,
  },
  sosIcon:  { fontSize: 28 },
  sosText:  { flex: 1 },
  sosTitle: { fontSize: 16, fontWeight: "800", color: "#fff", letterSpacing: 0.2 },
  sosSub:   { fontSize: 12, color: "rgba(255,255,255,0.75)", marginTop: 3 },
  sosArrow: { fontSize: 24, color: "rgba(255,255,255,0.6)", fontWeight: "700" },

  hero: {
    backgroundColor: colors.surface,
    borderRadius: 20,
    padding: 18,
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 14,
  },
  greeting:  { ...typography.caption, color: colors.accent, textTransform: "uppercase", letterSpacing: 1 },
  heroTitle: { ...typography.heading, color: colors.textPrimary, marginTop: 4 },
  logout:    { ...typography.body, color: colors.accent },

  mapCard: { backgroundColor: colors.surfaceMuted, borderRadius: 18, padding: 16 },
  cardTitle:{ ...typography.subheading, color: colors.textPrimary },
  cardText: { ...typography.body, color: colors.textSecondary, marginTop: 3 },
  warning:  { ...typography.caption, color: colors.warning, marginTop: 6 },

  searchRow:        { flexDirection: "row", gap: 10 },
  searchInput:      {
    flex: 1, borderRadius: 14, borderWidth: 1, borderColor: colors.border,
    paddingHorizontal: 14, paddingVertical: 12, backgroundColor: colors.surface,
    color: colors.textPrimary,
  },
  searchButton:     { backgroundColor: colors.accent, borderRadius: 14, paddingHorizontal: 18, justifyContent: "center" },
  searchButtonText: { color: colors.surface, fontWeight: "700" },

  quickActions: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  actionCard:   { backgroundColor: colors.surface, borderRadius: 16, paddingVertical: 12, paddingHorizontal: 16 },
  actionText:   { ...typography.body, color: colors.textPrimary },

  sectionTitle: { ...typography.heading, color: colors.textPrimary },

  animalCard: { backgroundColor: colors.surface, borderRadius: 18, padding: 16, gap: 4 },
  animalCardHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  animalName:   { ...typography.subheading, color: colors.textPrimary },
  statusPill:   {
    ...typography.caption, color: colors.accentDeep,
    backgroundColor: colors.surfaceMuted, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 999,
  },
  distance: { ...typography.caption, color: colors.success, marginTop: 6 },
});

export default HomeMapScreen;
