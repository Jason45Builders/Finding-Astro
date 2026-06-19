import { useState } from "react";
import { Alert, Pressable, ScrollView, StyleSheet, Text, TextInput } from "react-native";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { caseService } from "../services/case.service";
import { useAppDispatch, useAppSelector } from "../store";
import { addCase } from "../store/caseSlice";
import { AppStackParamList } from "../navigation/AppNavigator";
import { colors } from "../theme/colors";
import { typography } from "../theme/typography";
import { caseTypes } from "../utils/constants";
import { splitCsv, validateRequired } from "../utils/validators";
import { useLocation } from "../hooks/useLocation";

type Props = NativeStackScreenProps<AppStackParamList, "ReportCase">;

const ReportCaseScreen = ({ route, navigation }: Props) => {
  const dispatch = useAppDispatch();
  const token = useAppSelector((state) => state.auth.session?.token);
  const { currentLocation } = useLocation();
  const [caseType, setCaseType] = useState<(typeof caseTypes)[number]>("rescue");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [locationText, setLocationText] = useState("");
  const [evidenceUrls, setEvidenceUrls] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const submit = async () => {
    if (!token) {
      Alert.alert("Authentication", "You must be logged in to create a case.");
      return;
    }

    const titleError = validateRequired(title, "Title");
    const descriptionError = validateRequired(description, "Description");

    if (titleError || descriptionError) {
      Alert.alert("Validation", titleError ?? descriptionError ?? "Please review the form.");
      return;
    }

    setSubmitting(true);

    try {
      const createdCase = await caseService.createCase(token, {
        animalId: route.params?.animalId ?? null,
        caseType,
        title,
        description,
        priority: caseType === "abuse" ? "high" : "medium",
        locationText: locationText || null,
        evidenceUrls: splitCsv(evidenceUrls),
        location: currentLocation
      });

      dispatch(addCase(createdCase));
      Alert.alert("Success", "Case created successfully.");
      navigation.goBack();
    } catch (error) {
      Alert.alert("Failed", error instanceof Error ? error.message : "Unable to create case.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <Text style={styles.helperText}>
        Capture rescue, abuse, conflict, lost-pet, or ABC cases with concise evidence and location context.
      </Text>

      <Text style={styles.label}>Case type</Text>
      <TextInput value={caseType} editable={false} style={[styles.input, styles.readOnlyInput]} />
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipRow}>
        {caseTypes.map((item) => (
          <Pressable
            key={item}
            style={[styles.chip, caseType === item && styles.chipActive]}
            onPress={() => setCaseType(item)}
          >
            <Text style={[styles.chipText, caseType === item && styles.chipTextActive]}>{item}</Text>
          </Pressable>
        ))}
      </ScrollView>
      <TextInput value={title} onChangeText={setTitle} placeholder="Case title" style={styles.input} />
      <TextInput
        value={description}
        onChangeText={setDescription}
        placeholder="Describe the incident"
        style={[styles.input, styles.textArea]}
        multiline
      />
      <TextInput
        value={locationText}
        onChangeText={setLocationText}
        placeholder="Location notes"
        style={styles.input}
      />
      <TextInput
        value={evidenceUrls}
        onChangeText={setEvidenceUrls}
        placeholder="Evidence URLs separated by commas"
        style={[styles.input, styles.textArea]}
        multiline
      />

      <Pressable style={styles.button} onPress={() => void submit()} disabled={submitting}>
        <Text style={styles.buttonText}>{submitting ? "Saving..." : "Create case"}</Text>
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
  helperText: {
    ...typography.body,
    color: colors.textSecondary
  },
  label: {
    ...typography.caption,
    color: colors.textSecondary,
    textTransform: "uppercase",
    letterSpacing: 1
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
  readOnlyInput: {
    color: colors.accentDeep
  },
  chipRow: {
    gap: 10
  },
  chip: {
    backgroundColor: colors.surfaceMuted,
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 10
  },
  chipActive: {
    backgroundColor: colors.accent
  },
  chipText: {
    ...typography.body,
    color: colors.textPrimary
  },
  chipTextActive: {
    color: colors.surface,
    fontWeight: "700"
  },
  textArea: {
    minHeight: 110,
    textAlignVertical: "top"
  },
  button: {
    backgroundColor: colors.accent,
    borderRadius: 18,
    paddingVertical: 16,
    alignItems: "center"
  },
  buttonText: {
    color: colors.surface,
    fontWeight: "700",
    fontSize: 15
  }
});

export default ReportCaseScreen;
