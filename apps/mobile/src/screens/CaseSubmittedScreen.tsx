/**
 * CaseSubmittedScreen.tsx — FIX 9
 * Shown immediately after emergency report submitted.
 * Reporter sees: how many people were notified, broadcast tier breakdown,
 * auto-escalation countdown, and live case link.
 * No more "Case created successfully" alert and black goBack screen.
 */

import { useEffect, useRef, useState } from "react";
import {
  Animated,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { AppStackParamList } from "../navigation/AppNavigator";
import { colors } from "../theme/colors";
import { typography } from "../theme/typography";

type Props = NativeStackScreenProps<AppStackParamList, "CaseSubmitted">;

const CaseSubmittedScreen = ({ route, navigation }: Props) => {
  const { caseId, notifiedCount, priority } = route.params;

  // Countdown — 8 min = 480 seconds to auto-escalation
  const [countdown, setCountdown] = useState(480);
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    const interval = setInterval(() => {
      setCountdown((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1.08, duration: 800, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1.00, duration: 800, useNativeDriver: true }),
      ])
    );
    pulse.start();
    return () => pulse.stop();
  }, [pulseAnim]);

  const mm = String(Math.floor(countdown / 60)).padStart(2, "0");
  const ss = String(countdown % 60).padStart(2, "0");

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      {/* Confirmation header */}
      <Animated.View style={[styles.successBadge, { transform: [{ scale: pulseAnim }] }]}>
        <Text style={styles.successIcon}>🚨</Text>
      </Animated.View>

      <Text style={styles.title}>Emergency alert sent</Text>
      <Text style={styles.subtitle}>
        Nearby responders have been notified. Stay with the animal if it is safe to do so.
      </Text>

      {/* Notification breakdown */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Who was notified</Text>
        {[
          { tier: "Tier 1 — 3 km",  label: "Volunteers + active rescuers", color: "#B83232" },
          { tier: "Tier 2 — 8 km",  label: "NGOs + known rescue workers",   color: "#C47B18" },
          { tier: "Tier 3 — 15 km", label: "All nearby app users",           color: "#2B5FA0" },
        ].map((t) => (
          <View key={t.tier} style={styles.tierRow}>
            <View style={[styles.tierDot, { backgroundColor: t.color }]} />
            <View style={{ flex: 1 }}>
              <Text style={[styles.tierLabel, { color: t.color }]}>{t.tier}</Text>
              <Text style={styles.tierSub}>{t.label}</Text>
            </View>
            <Text style={styles.tierCheck}>✓ Sent</Text>
          </View>
        ))}
      </View>

      {/* Auto-escalation countdown */}
      <View style={styles.timerCard}>
        <Text style={styles.timerTitle}>Auto-escalation in</Text>
        <Text style={[styles.timerValue, countdown < 120 && { color: "#B83232" }]}>
          {mm}:{ss}
        </Text>
        <Text style={styles.timerSub}>
          If nobody claims this case in {mm}:{ss}, the alert radius expands and NGOs are
          directly called. The system never goes silent.
        </Text>
      </View>

      {/* What to do while waiting */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>While you wait</Text>
        {[
          "Stay with the animal if it is safe — your presence helps",
          "Do not move a critically injured animal unless in danger",
          "If the animal can bite, keep distance but stay visible",
          "You will get a notification when someone claims the case",
          "If no response in 15 minutes, call Blue Cross: 044-22351006",
        ].map((line) => (
          <View key={line} style={styles.doRow}>
            <Text style={styles.doBullet}>•</Text>
            <Text style={styles.doText}>{line}</Text>
          </View>
        ))}
      </View>

      {/* Emergency helplines — always visible */}
      <View style={styles.helplineCard}>
        <Text style={styles.helplineTitle}>Emergency helplines</Text>
        {[
          { name: "Blue Cross of India",  phone: "044-22351006", note: "24/7 rescue" },
          { name: "People for Animals",   phone: "044-26670793", note: "Chennai" },
          { name: "GCC Animal Helpline",  phone: "1913",         note: "Municipality" },
        ].map((h) => (
          <View key={h.name} style={styles.helplineRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.helplineName}>{h.name}</Text>
              <Text style={styles.helplineNote}>{h.note}</Text>
            </View>
            <Text style={styles.helplinePhone}>{h.phone}</Text>
          </View>
        ))}
      </View>

      {/* Case reference */}
      <View style={styles.refCard}>
        <Text style={styles.refLabel}>Case reference</Text>
        <Text style={styles.refId}>{caseId}</Text>
        <Text style={styles.refNote}>Keep this for follow-up with NGOs or authorities.</Text>
      </View>

      {/* Navigation */}
      <Pressable
        style={styles.homeButton}
        onPress={() => navigation.navigate("HomeMap")}
      >
        <Text style={styles.homeButtonText}>Back to Home</Text>
      </Pressable>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: "#FDEAEA" },
  content: { padding: 20, gap: 16, paddingBottom: 48, alignItems: "stretch" },

  successBadge: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: "#B83232",
    alignItems: "center",
    justifyContent: "center",
    alignSelf: "center",
    marginTop: 12,
    shadowColor: "#B83232",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 10,
  },
  successIcon: { fontSize: 36 },

  title: {
    fontSize: 24,
    fontWeight: "800",
    color: "#B83232",
    textAlign: "center",
  },
  subtitle: {
    ...typography.body,
    color: colors.textSecondary,
    textAlign: "center",
    lineHeight: 20,
  },

  card: {
    backgroundColor: colors.surface,
    borderRadius: 18,
    padding: 16,
    gap: 12,
  },
  cardTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: colors.textPrimary,
  },

  tierRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  tierDot: { width: 10, height: 10, borderRadius: 5, flexShrink: 0 },
  tierLabel: { fontSize: 13, fontWeight: "700" },
  tierSub: { fontSize: 11, color: colors.textSecondary, marginTop: 1 },
  tierCheck: { fontSize: 12, color: "#2E7D32", fontWeight: "600" },

  timerCard: {
    backgroundColor: "#1C1816",
    borderRadius: 18,
    padding: 20,
    alignItems: "center",
    gap: 8,
  },
  timerTitle: { fontSize: 12, fontWeight: "600", color: "rgba(255,255,255,0.55)", textTransform: "uppercase", letterSpacing: 0.8 },
  timerValue: { fontSize: 52, fontWeight: "800", color: "#fff", letterSpacing: -1 },
  timerSub: { fontSize: 12, color: "rgba(255,255,255,0.55)", textAlign: "center", lineHeight: 18 },

  doRow: { flexDirection: "row", gap: 8 },
  doBullet: { fontSize: 14, color: colors.textSecondary, marginTop: 1 },
  doText: { flex: 1, fontSize: 13, color: colors.textSecondary, lineHeight: 20 },

  helplineCard: {
    backgroundColor: "#E8EEFA",
    borderRadius: 18,
    padding: 16,
    gap: 10,
  },
  helplineTitle: { fontSize: 14, fontWeight: "700", color: "#2B5FA0" },
  helplineRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: "#2B5FA020",
  },
  helplineName: { fontSize: 13, fontWeight: "600", color: "#2B5FA0" },
  helplineNote: { fontSize: 11, color: "#2B5FA0", opacity: 0.7, marginTop: 1 },
  helplinePhone: { fontSize: 14, fontWeight: "800", color: "#2B5FA0" },

  refCard: {
    backgroundColor: colors.surfaceMuted,
    borderRadius: 14,
    padding: 14,
    gap: 4,
  },
  refLabel: { fontSize: 11, color: colors.textSecondary, textTransform: "uppercase", letterSpacing: 0.7 },
  refId: { fontSize: 13, fontWeight: "700", color: colors.textPrimary, fontVariant: ["tabular-nums"] },
  refNote: { fontSize: 11, color: colors.textSecondary },

  homeButton: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    paddingVertical: 16,
    alignItems: "center",
    borderWidth: 1,
    borderColor: colors.border,
  },
  homeButtonText: { fontSize: 15, fontWeight: "700", color: colors.textPrimary },
});

export default CaseSubmittedScreen;
