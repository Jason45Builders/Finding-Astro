import { ActivityIndicator, StyleSheet, Text, View } from "react-native";
import { colors } from "../theme/colors";
import { typography } from "../theme/typography";

const SplashScreen = () => (
  <View style={styles.container}>
    <View style={styles.badge}>
      <Text style={styles.badgeText}>FA</Text>
    </View>
    <Text style={styles.title}>Finding Astro</Text>
    <Text style={styles.subtitle}>Animal welfare and accountability in one shared map.</Text>
    <ActivityIndicator size="large" color={colors.accent} style={styles.loader} />
  </View>
);

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    alignItems: "center",
    justifyContent: "center",
    padding: 24
  },
  badge: {
    width: 88,
    height: 88,
    borderRadius: 28,
    backgroundColor: colors.accent,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 20
  },
  badgeText: {
    color: colors.surface,
    fontSize: 28,
    fontWeight: "800"
  },
  title: {
    ...typography.title,
    color: colors.textPrimary
  },
  subtitle: {
    ...typography.body,
    color: colors.textSecondary,
    textAlign: "center",
    marginTop: 8
  },
  loader: {
    marginTop: 24
  }
});

export default SplashScreen;
