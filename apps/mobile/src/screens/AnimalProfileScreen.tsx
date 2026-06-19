import { useEffect, useState } from "react";
import { Alert, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useAnimals } from "../hooks/useAnimals";
import { useLocation } from "../hooks/useLocation";
import { AppStackParamList } from "../navigation/AppNavigator";
import { colors } from "../theme/colors";
import { typography } from "../theme/typography";
import { formatDistance } from "../utils/geo";
import { validateRequired } from "../utils/validators";

type Props = NativeStackScreenProps<AppStackParamList, "AnimalProfile">;

const AnimalProfileScreen = ({ route, navigation }: Props) => {
  const { animalId } = route.params;
  const { selected, loadAnimalById, loadMatches, reportSighting, loading } = useAnimals();
  const { currentLocation } = useLocation();
  const [sightingDescription, setSightingDescription] = useState("");

  useEffect(() => {
    void loadAnimalById(animalId);
  }, [animalId, loadAnimalById]);

  const submitSighting = async () => {
    const error = validateRequired(sightingDescription, "Sighting description");

    if (error) {
      Alert.alert("Validation", error);
      return;
    }

    try {
      await reportSighting({
        matchedAnimalId: animalId,
        description: sightingDescription,
        locationText: "Citizen report from mobile app",
        location: currentLocation
      });

      Alert.alert("Saved", "Sighting logged successfully.");
      setSightingDescription("");
    } catch (submitError) {
      Alert.alert("Failed", submitError instanceof Error ? submitError.message : "Unable to save sighting.");
    }
  };

  const runMatchSuggestions = async () => {
    if (!selected) {
      return;
    }

    try {
      const matches = await loadMatches({
        animalId: selected.id,
        location: selected.location
      });

      navigation.navigate("MatchResults", {
        title: `${selected.name ?? selected.species} matches`,
        matches
      });
    } catch (matchError) {
      Alert.alert("Failed", matchError instanceof Error ? matchError.message : "Unable to fetch matches.");
    }
  };

  if (!selected) {
    return (
      <View style={styles.loadingState}>
        <Text style={styles.loadingText}>Loading animal profile...</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <View style={styles.hero}>
        <Text style={styles.title}>{selected.name ?? selected.species}</Text>
        <Text style={styles.meta}>
          {selected.species} {selected.breed ? `• ${selected.breed}` : ""} • {selected.status}
        </Text>
        <Text style={styles.distance}>{formatDistance(selected.distanceKm)}</Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Profile</Text>
        <Text style={styles.bodyText}>{selected.description ?? "No description yet."}</Text>
        <Text style={styles.bodyText}>Color: {selected.color ?? "Unknown"}</Text>
        <Text style={styles.bodyText}>Temperament: {selected.temperament ?? "Not noted"}</Text>
        <Text style={styles.bodyText}>Last seen: {selected.lastSeenText ?? "Not recorded"}</Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Report a sighting</Text>
        <TextInput
          value={sightingDescription}
          onChangeText={setSightingDescription}
          placeholder="Describe where and how the animal was seen"
          style={[styles.input, styles.textArea]}
          multiline
        />
        <Pressable style={styles.secondaryButton} onPress={() => void submitSighting()} disabled={loading}>
          <Text style={styles.secondaryButtonText}>Submit sighting</Text>
        </Pressable>
      </View>

      <Pressable style={styles.primaryButton} onPress={() => void runMatchSuggestions()} disabled={loading}>
        <Text style={styles.primaryButtonText}>Check lost & found matches</Text>
      </Pressable>

      <Pressable
        style={styles.linkButton}
        onPress={() => navigation.navigate("ReportCase", { animalId: selected.id })}
      >
        <Text style={styles.linkText}>Create a rescue or welfare case for this animal</Text>
      </Pressable>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.background
  },
  content: {
    padding: 20,
    gap: 16
  },
  loadingState: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.background
  },
  loadingText: {
    ...typography.body,
    color: colors.textSecondary
  },
  hero: {
    backgroundColor: colors.surface,
    borderRadius: 24,
    padding: 22
  },
  title: {
    ...typography.title,
    color: colors.textPrimary
  },
  meta: {
    ...typography.body,
    color: colors.textSecondary,
    marginTop: 6
  },
  distance: {
    ...typography.caption,
    color: colors.success,
    marginTop: 10
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: 20,
    padding: 18,
    gap: 8
  },
  sectionTitle: {
    ...typography.subheading,
    color: colors.textPrimary
  },
  bodyText: {
    ...typography.body,
    color: colors.textSecondary
  },
  input: {
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.background,
    paddingHorizontal: 14,
    paddingVertical: 14,
    color: colors.textPrimary
  },
  textArea: {
    minHeight: 110,
    textAlignVertical: "top"
  },
  primaryButton: {
    backgroundColor: colors.accent,
    paddingVertical: 16,
    borderRadius: 18,
    alignItems: "center"
  },
  primaryButtonText: {
    color: colors.surface,
    fontWeight: "700",
    fontSize: 15
  },
  secondaryButton: {
    backgroundColor: colors.surfaceMuted,
    paddingVertical: 14,
    borderRadius: 16,
    alignItems: "center"
  },
  secondaryButtonText: {
    color: colors.textPrimary,
    fontWeight: "700"
  },
  linkButton: {
    paddingVertical: 6
  },
  linkText: {
    ...typography.body,
    color: colors.accentDeep
  }
});

export default AnimalProfileScreen;
