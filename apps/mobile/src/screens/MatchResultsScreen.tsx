import { ScrollView, StyleSheet, Text, View } from "react-native";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { AppStackParamList } from "../navigation/AppNavigator";
import { colors } from "../theme/colors";
import { typography } from "../theme/typography";
import { formatDistance } from "../utils/geo";

type Props = NativeStackScreenProps<AppStackParamList, "MatchResults">;

const MatchResultsScreen = ({ route }: Props) => {
  const matches = route.params.matches ?? [];
  const duplicates = route.params.duplicates ?? [];

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <Text style={styles.title}>{route.params.title ?? "Match results"}</Text>

      {matches.length === 0 && duplicates.length === 0 ? (
        <View style={styles.emptyCard}>
          <Text style={styles.emptyText}>No matches available yet. Try broadening the search radius or reporting a new sighting.</Text>
        </View>
      ) : null}

      {matches.map((match) => (
        <View key={match.referenceId} style={styles.card}>
          <Text style={styles.cardTitle}>{match.title}</Text>
          <Text style={styles.cardText}>{match.summary}</Text>
          <Text style={styles.badge}>Confidence: {match.confidence}%</Text>
          <Text style={styles.distance}>{formatDistance(match.distanceKm)}</Text>
        </View>
      ))}

      {duplicates.map((duplicate) => (
        <View key={duplicate.animal.id} style={styles.card}>
          <Text style={styles.cardTitle}>{duplicate.animal.name ?? duplicate.animal.species}</Text>
          <Text style={styles.cardText}>{duplicate.reason}</Text>
          <Text style={styles.badge}>Confidence: {duplicate.confidence}%</Text>
          <Text style={styles.distance}>{formatDistance(duplicate.animal.distanceKm)}</Text>
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
  emptyCard: {
    backgroundColor: colors.surface,
    borderRadius: 20,
    padding: 20
  },
  emptyText: {
    ...typography.body,
    color: colors.textSecondary
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: 20,
    padding: 18,
    gap: 6
  },
  cardTitle: {
    ...typography.subheading,
    color: colors.textPrimary
  },
  cardText: {
    ...typography.body,
    color: colors.textSecondary
  },
  badge: {
    ...typography.caption,
    color: colors.accentDeep
  },
  distance: {
    ...typography.caption,
    color: colors.success
  }
});

export default MatchResultsScreen;
