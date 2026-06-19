import { useEffect } from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { caseService } from "../services/case.service";
import { useAppDispatch, useAppSelector } from "../store";
import { setCaseError, setLegalContent } from "../store/caseSlice";
import { colors } from "../theme/colors";
import { typography } from "../theme/typography";

const LegalHubScreen = () => {
  const dispatch = useAppDispatch();
  const legalContent = useAppSelector((state) => state.cases.legalContent);

  useEffect(() => {
    const load = async () => {
      try {
        const content = await caseService.getLegalContent();
        dispatch(setLegalContent(content));
        dispatch(setCaseError(null));
      } catch (error) {
        dispatch(setCaseError(error instanceof Error ? error.message : "Unable to load legal content."));
      }
    };

    void load();
  }, [dispatch]);

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <Text style={styles.title}>Practical legal guidance</Text>
      <Text style={styles.subtitle}>
        Keep records, escalate safely, and use structured evidence to support animal welfare action.
      </Text>

      {legalContent?.sections.map((section) => (
        <View key={section.title} style={styles.card}>
          <Text style={styles.cardTitle}>{section.title}</Text>
          <Text style={styles.cardSummary}>{section.summary}</Text>
          {section.actions.map((action) => (
            <Text key={action} style={styles.cardAction}>
              • {action}
            </Text>
          ))}
        </View>
      ))}
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
  title: {
    ...typography.heading,
    color: colors.textPrimary
  },
  subtitle: {
    ...typography.body,
    color: colors.textSecondary
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: 20,
    padding: 18,
    gap: 8
  },
  cardTitle: {
    ...typography.subheading,
    color: colors.textPrimary
  },
  cardSummary: {
    ...typography.body,
    color: colors.textSecondary
  },
  cardAction: {
    ...typography.body,
    color: colors.textPrimary
  }
});

export default LegalHubScreen;
