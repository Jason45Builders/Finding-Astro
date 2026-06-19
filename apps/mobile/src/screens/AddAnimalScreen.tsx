import { useState } from "react";
import { Alert, Pressable, ScrollView, StyleSheet, Switch, Text, TextInput, View } from "react-native";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useAnimals } from "../hooks/useAnimals";
import { useLocation } from "../hooks/useLocation";
import { AppStackParamList } from "../navigation/AppNavigator";
import { colors } from "../theme/colors";
import { typography } from "../theme/typography";
import { splitCsv, validateRequired } from "../utils/validators";

type Props = NativeStackScreenProps<AppStackParamList, "AddAnimal">;

const AddAnimalScreen = ({ navigation }: Props) => {
  const { createAnimal, loading } = useAnimals();
  const { currentLocation } = useLocation();
  const [name, setName] = useState("");
  const [species, setSpecies] = useState("dog");
  const [breed, setBreed] = useState("");
  const [color, setColor] = useState("");
  const [description, setDescription] = useState("");
  const [lastSeenText, setLastSeenText] = useState("");
  const [photoUrls, setPhotoUrls] = useState("");
  const [isSterilized, setIsSterilized] = useState(false);

  const submit = async () => {
    const speciesError = validateRequired(species, "Species");

    if (speciesError) {
      Alert.alert("Validation", speciesError);
      return;
    }

    try {
      const result = await createAnimal({
        name: name || null,
        species,
        breed: breed || null,
        color: color || null,
        description: description || null,
        lastSeenText: lastSeenText || null,
        photoUrls: splitCsv(photoUrls),
        isSterilized,
        status: "community",
        location: currentLocation
      });

      if (result.duplicates.length) {
        navigation.navigate("MatchResults", {
          title: "Potential duplicates",
          duplicates: result.duplicates
        });
      } else {
        Alert.alert("Success", "Animal record created.");
        navigation.goBack();
      }
    } catch (error) {
      Alert.alert("Failed", error instanceof Error ? error.message : "Unable to create animal.");
    }
  };

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <Text style={styles.intro}>
        Create a community memory record with current location, appearance, and care notes.
      </Text>

      <TextInput value={name} onChangeText={setName} placeholder="Name (optional)" style={styles.input} />
      <TextInput value={species} onChangeText={setSpecies} placeholder="Species" style={styles.input} />
      <TextInput value={breed} onChangeText={setBreed} placeholder="Breed" style={styles.input} />
      <TextInput value={color} onChangeText={setColor} placeholder="Color" style={styles.input} />
      <TextInput
        value={description}
        onChangeText={setDescription}
        placeholder="Description"
        multiline
        style={[styles.input, styles.textArea]}
      />
      <TextInput
        value={lastSeenText}
        onChangeText={setLastSeenText}
        placeholder="Location note"
        style={styles.input}
      />
      <TextInput
        value={photoUrls}
        onChangeText={setPhotoUrls}
        placeholder="Photo URLs separated by commas"
        style={[styles.input, styles.textArea]}
        multiline
      />

      <View style={styles.switchRow}>
        <Text style={styles.label}>Sterilized</Text>
        <Switch value={isSterilized} onValueChange={setIsSterilized} />
      </View>

      <Pressable style={styles.button} onPress={() => void submit()} disabled={loading}>
        <Text style={styles.buttonText}>{loading ? "Saving..." : "Create animal record"}</Text>
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
    gap: 14
  },
  intro: {
    ...typography.body,
    color: colors.textSecondary
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
    minHeight: 110,
    textAlignVertical: "top"
  },
  switchRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 6
  },
  label: {
    ...typography.body,
    color: colors.textPrimary
  },
  button: {
    backgroundColor: colors.accent,
    paddingVertical: 16,
    borderRadius: 18,
    alignItems: "center"
  },
  buttonText: {
    color: colors.surface,
    fontSize: 15,
    fontWeight: "700"
  }
});

export default AddAnimalScreen;
