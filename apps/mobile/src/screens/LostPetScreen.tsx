import { useState } from "react";
import {
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View
} from "react-native";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useAnimals } from "../hooks/useAnimals";
import { useLocation } from "../hooks/useLocation";
import { AppStackParamList } from "../navigation/AppNavigator";
import { colors } from "../theme/colors";
import { typography } from "../theme/typography";
import { validateRequired } from "../utils/validators";

type Props = NativeStackScreenProps<AppStackParamList, "LostPet">;

const LostPetScreen = ({ navigation }: Props) => {
  const { createAnimal, loadMatches, reportSighting, loading } = useAnimals();
  const { currentLocation } = useLocation();
  const [mode, setMode] = useState<"lost" | "sighting">("lost");
  const [name, setName] = useState("");
  const [species, setSpecies] = useState("dog");
  const [color, setColor] = useState("");
  const [description, setDescription] = useState("");
  const [matchedAnimalId, setMatchedAnimalId] = useState("");

  const submitLostPet = async () => {
    const speciesError = validateRequired(species, "Species");
    const descriptionError = validateRequired(description, "Description");

    if (speciesError || descriptionError) {
      Alert.alert("Validation", speciesError ?? descriptionError ?? "Please review the form.");
      return;
    }

    try {
      const result = await createAnimal({
        name: name || null,
        species,
        color: color || null,
        description,
        status: "lost",
        lastSeenText: "Reported from lost-pet flow",
        location: currentLocation
      });

      const matches = await loadMatches({
        animalId: result.animal.id,
        location: result.animal.location
      });

      navigation.navigate("MatchResults", {
        title: `${result.animal.name ?? result.animal.species} match suggestions`,
        matches
      });
    } catch (error) {
      Alert.alert("Failed", error instanceof Error ? error.message : "Unable to create lost pet report.");
    }
  };

  const submitSighting = async () => {
    const descriptionError = validateRequired(description, "Description");

    if (descriptionError) {
      Alert.alert("Validation", descriptionError);
      return;
    }

    try {
      await reportSighting({
        matchedAnimalId: matchedAnimalId || null,
        description,
        locationText: "Lost & found sighting",
        location: currentLocation
      });

      Alert.alert("Saved", "Sighting reported successfully.");
      setDescription("");
      setMatchedAnimalId("");
    } catch (error) {
      Alert.alert("Failed", error instanceof Error ? error.message : "Unable to report sighting.");
    }
  };

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <View style={styles.toggleRow}>
        <Pressable
          style={[styles.toggleButton, mode === "lost" && styles.toggleActive]}
          onPress={() => setMode("lost")}
        >
          <Text style={[styles.toggleText, mode === "lost" && styles.toggleTextActive]}>Report lost pet</Text>
        </Pressable>
        <Pressable
          style={[styles.toggleButton, mode === "sighting" && styles.toggleActive]}
          onPress={() => setMode("sighting")}
        >
          <Text style={[styles.toggleText, mode === "sighting" && styles.toggleTextActive]}>Report sighting</Text>
        </Pressable>
      </View>

      {mode === "lost" ? (
        <>
          <TextInput value={name} onChangeText={setName} placeholder="Pet name" style={styles.input} />
          <TextInput value={species} onChangeText={setSpecies} placeholder="Species" style={styles.input} />
          <TextInput value={color} onChangeText={setColor} placeholder="Color or markings" style={styles.input} />
          <TextInput
            value={description}
            onChangeText={setDescription}
            placeholder="Recent circumstances and identifying clues"
            style={[styles.input, styles.textArea]}
            multiline
          />
          <Pressable style={styles.primaryButton} onPress={() => void submitLostPet()} disabled={loading}>
            <Text style={styles.primaryButtonText}>{loading ? "Searching..." : "Create report and find matches"}</Text>
          </Pressable>
        </>
      ) : (
        <>
          <TextInput
            value={matchedAnimalId}
            onChangeText={setMatchedAnimalId}
            placeholder="Known animal ID (optional)"
            style={styles.input}
          />
          <TextInput
            value={description}
            onChangeText={setDescription}
            placeholder="Where was the animal seen?"
            style={[styles.input, styles.textArea]}
            multiline
          />
          <Pressable style={styles.primaryButton} onPress={() => void submitSighting()} disabled={loading}>
            <Text style={styles.primaryButtonText}>{loading ? "Saving..." : "Submit sighting"}</Text>
          </Pressable>
        </>
      )}
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
    gap: 14
  },
  toggleRow: {
    flexDirection: "row",
    backgroundColor: colors.surfaceMuted,
    padding: 4,
    borderRadius: 18
  },
  toggleButton: {
    flex: 1,
    paddingVertical: 12,
    alignItems: "center",
    borderRadius: 14
  },
  toggleActive: {
    backgroundColor: colors.surface
  },
  toggleText: {
    ...typography.body,
    color: colors.textSecondary
  },
  toggleTextActive: {
    color: colors.textPrimary,
    fontWeight: "700"
  },
  input: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 14,
    borderWidth: 1,
    borderColor: colors.border,
    color: colors.textPrimary
  },
  textArea: {
    minHeight: 120,
    textAlignVertical: "top"
  },
  primaryButton: {
    backgroundColor: colors.accent,
    borderRadius: 18,
    paddingVertical: 16,
    alignItems: "center"
  },
  primaryButtonText: {
    color: colors.surface,
    fontWeight: "700",
    fontSize: 15
  }
});

export default LostPetScreen;
