import { useState } from "react";
import { Alert, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { useLocation } from "../hooks/useLocation";
import { caseService } from "../services/case.service";
import { useAppDispatch, useAppSelector } from "../store";
import { addCase, setConflictActions } from "../store/caseSlice";
import { colors } from "../theme/colors";
import { typography } from "../theme/typography";
import { validateRequired } from "../utils/validators";

const ConflictScreen = () => {
  const dispatch = useAppDispatch();
  const token = useAppSelector((state) => state.auth.session?.token);
  const actions = useAppSelector((state) => state.cases.conflictActions);
  const { currentLocation } = useLocation();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [severity, setSeverity] = useState<"low" | "medium" | "high">("medium");
  const [submitting, setSubmitting] = useState(false);

  const submit = async () => {
    if (!token) {
      Alert.alert("Authentication", "You must be logged in to submit a conflict concern.");
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
      const result = await caseService.submitConflict(token, {
        title,
        description,
        severity,
        locationText: "Conflict report from mobile client",
        location: currentLocation
      });

      dispatch(addCase(result.caseRecord));
      dispatch(setConflictActions(result.suggestedActions));
      Alert.alert("Logged", "Conflict concern saved with response suggestions.");
    } catch (error) {
      Alert.alert("Failed", error instanceof Error ? error.message : "Unable to log concern.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <Text style={styles.helperText}>
        Use this flow to capture resident concerns, feeding disputes, or safety patterns around community animals.
      </Text>

      <TextInput value={title} onChangeText={setTitle} placeholder="Concern title" style={styles.input} />
      <Text style={styles.label}>Severity</Text>
      <View style={styles.chipRow}>
        {(["low", "medium", "high"] as const).map((item) => (
          <Pressable
            key={item}
            style={[styles.chip, severity === item && styles.chipActive]}
            onPress={() => setSeverity(item)}
          >
            <Text style={[styles.chipText, severity === item && styles.chipTextActive]}>{item}</Text>
          </Pressable>
        ))}
      </View>
      <TextInput
        value={description}
        onChangeText={setDescription}
        placeholder="What happened and what support is needed?"
        multiline
        style={[styles.input, styles.textArea]}
      />

      <Pressable style={styles.button} onPress={() => void submit()} disabled={submitting}>
        <Text style={styles.buttonText}>{submitting ? "Saving..." : "Log concern"}</Text>
      </Pressable>

      {actions.length ? (
        <View style={styles.resultCard}>
          <Text style={styles.sectionTitle}>Suggested next actions</Text>
          {actions.map((item) => (
            <Text key={item} style={styles.resultItem}>
              • {item}
            </Text>
          ))}
        </View>
      ) : null}
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
  chipRow: {
    flexDirection: "row",
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
  },
  resultCard: {
    backgroundColor: colors.surface,
    borderRadius: 20,
    padding: 18,
    gap: 8
  },
  sectionTitle: {
    ...typography.subheading,
    color: colors.textPrimary
  },
  resultItem: {
    ...typography.body,
    color: colors.textSecondary
  }
});

export default ConflictScreen;
