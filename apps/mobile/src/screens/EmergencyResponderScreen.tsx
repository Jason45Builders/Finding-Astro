/**
 * EmergencyResponderScreen.tsx
 *
 * FIXES APPLIED:
 *   FIX 5 — Nearby clinics shown immediately after claim. Sorted: 24hr stray-accepting
 *            first. Real GPS distance from responder's current location.
 *   FIX 6 — Transport request button in the flow. If responder has no vehicle,
 *            they see the slab picker (₹150/₹250/₹350) and can request transport.
 *   FIX 7 — Every status update (en_route, on_scene, picked_up, at_hospital)
 *            is pushed to the reporter in real time, not just on "completed".
 */

import { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useAppSelector } from "../store";
import { useLocation } from "../hooks/useLocation";
import { apiRequest } from "../services/api";
import { AppStackParamList } from "../navigation/AppNavigator";
import { colors } from "../theme/colors";
import { typography } from "../theme/typography";

type Props = NativeStackScreenProps<AppStackParamList, "EmergencyResponder">;

type ResponderStatus = "claimed" | "en_route" | "on_scene" | "picked_up" | "at_hospital" | "completed";
type TransportSlab   = { id: string; label: string; vehicle: string; amount: number };

const STATUS_ORDER: ResponderStatus[] = ["claimed", "en_route", "on_scene", "picked_up", "at_hospital", "completed"];

const STATUS_META: Record<ResponderStatus, { label: string; icon: string; reporterMsg: string }> = {
  claimed:    { label: "Claimed",           icon: "🙋", reporterMsg: "A responder has claimed your case and is heading to the location." },
  en_route:   { label: "En Route",          icon: "🚗", reporterMsg: "The responder is on their way to the animal." },
  on_scene:   { label: "On Scene",          icon: "📍", reporterMsg: "The responder has reached the animal's location." },
  picked_up:  { label: "Animal Picked Up",  icon: "🐕", reporterMsg: "The animal has been picked up and is being taken to a clinic." },
  at_hospital:{ label: "At Hospital",       icon: "🏥", reporterMsg: "The animal has arrived at the clinic for treatment." },
  completed:  { label: "Completed",         icon: "✅", reporterMsg: "The case has been resolved. The animal is receiving care." },
};

const TRANSPORT_SLABS: TransportSlab[] = [
  { id: "s1", vehicle: "🛵", label: "Two-wheeler (up to 5 km)", amount: 150 },
  { id: "s2", vehicle: "🛺", label: "Auto-rickshaw (up to 8 km)", amount: 250 },
  { id: "s3", vehicle: "🚗", label: "Car / cab (any distance)", amount: 350 },
];

interface Clinic {
  id: string; name: string; address: string; phone: string | null;
  emergency24hr: boolean; acceptsStrays: boolean; hasSurgery: boolean;
  operatingHours: string | null; distanceKm: number;
}

const EmergencyResponderScreen = ({ route, navigation }: Props) => {
  const { caseId, caseTitle, latitude, longitude } = route.params;
  const token          = useAppSelector((s) => s.auth.session?.token);
  const { currentLocation } = useLocation();

  const [status,          setStatus]          = useState<ResponderStatus>("claimed");
  const [timer,           setTimer]           = useState(900); // 15 min window
  const [loading,         setLoading]         = useState(false);
  const [showTransport,   setShowTransport]   = useState(false);
  const [selectedSlab,    setSelectedSlab]    = useState<string | null>(null);
  const [clinics,         setClinics]         = useState<Clinic[]>([]);
  const [clinicsLoading,  setClinicsLoading]  = useState(true);
  const [selectedClinic,  setSelectedClinic]  = useState<string | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Start countdown
  useEffect(() => {
    timerRef.current = setInterval(() => setTimer((p) => (p > 0 ? p - 1 : 0)), 1000);
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, []);

  // FIX 5: Load nearby clinics immediately after mounting
  useEffect(() => {
    const load = async () => {
      setClinicsLoading(true);
      try {
        const data = await apiRequest<Clinic[]>(
          `/partners/clinics?latitude=${currentLocation.latitude}&longitude=${currentLocation.longitude}&radiusKm=15&straysOnly=true`,
          { token: token ?? undefined }
        );
        setClinics(data ?? []);
      } catch {
        // Non-fatal — show manual helpline fallback
      } finally {
        setClinicsLoading(false);
      }
    };
    void load();
  }, [currentLocation.latitude, currentLocation.longitude, token]);

  // FIX 7: Push status update and notify reporter via backend
  const advanceStatus = useCallback(async (next: ResponderStatus) => {
    setLoading(true);
    try {
      await apiRequest(`/emergency/${caseId}/status`, {
        method: "PATCH",
        token:  token ?? undefined,
        body: {
          status:     next,
          hospitalId: next === "at_hospital" ? selectedClinic : undefined,
          notes:      STATUS_META[next].reporterMsg,
        },
      });
      setStatus(next);
      // Reporter notification happens server-side on every status change (backend fix)
    } catch (err) {
      Alert.alert("Update failed", err instanceof Error ? err.message : "Try again.");
    } finally {
      setLoading(false);
    }
  }, [caseId, token, selectedClinic]);

  const abandonCase = () => {
    Alert.alert(
      "Abandon case?",
      "The case will be re-broadcast to other responders immediately.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Abandon",
          style: "destructive",
          onPress: async () => {
            try {
              await apiRequest(`/emergency/${caseId}/abandon`, {
                method: "POST",
                token:  token ?? undefined,
                body:   { reason: "Responder unable to continue" },
              });
              navigation.goBack();
            } catch (err) {
              Alert.alert("Failed", err instanceof Error ? err.message : "Try again.");
            }
          },
        },
      ]
    );
  };

  const requestTransport = async () => {
    if (!selectedSlab) {
      Alert.alert("Select a vehicle", "Choose a transport option first.");
      return;
    }
    try {
      await apiRequest("/recovery/transport/request", {
        method: "POST",
        token:  token ?? undefined,
        body:   { caseId, slabId: selectedSlab, fundingSource: "case_pool" },
      });
      Alert.alert("Transport requested ✓", "A transport vehicle has been requested from the case pool.");
      setShowTransport(false);
    } catch (err) {
      Alert.alert("Failed", err instanceof Error ? err.message : "Try again.");
    }
  };

  const currentIdx = STATUS_ORDER.indexOf(status);
  const nextStatus  = STATUS_ORDER[currentIdx + 1] as ResponderStatus | undefined;
  const mm = String(Math.floor(timer / 60)).padStart(2, "0");
  const ss = String(timer % 60).padStart(2, "0");

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      {/* Case info */}
      <View style={styles.caseCard}>
        <Text style={styles.casePriority}>HIGH PRIORITY · RESCUE</Text>
        <Text style={styles.caseTitle}>{caseTitle}</Text>
        <Text style={styles.caseCoords}>
          📍 {latitude.toFixed(5)}, {longitude.toFixed(5)}
        </Text>
      </View>

      {/* Timer */}
      <View style={styles.timerCard}>
        <Text style={styles.timerLabel}>Response window</Text>
        <Text style={[styles.timerValue, timer < 180 && { color: "#B83232" }]}>{mm}:{ss}</Text>
        <Text style={styles.timerSub}>Update your status before timer expires</Text>
      </View>

      {/* Status tracker — FIX 7: each tap sends server update + notifies reporter */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Update your status</Text>
        <Text style={styles.cardSub}>Each update is sent to the reporter in real time</Text>
        {STATUS_ORDER.map((s, i) => {
          const meta = STATUS_META[s];
          const done = i < currentIdx;
          const curr = i === currentIdx;
          const next = i === currentIdx + 1;
          return (
            <Pressable
              key={s}
              style={[
                styles.statusRow,
                curr  && styles.statusRowCurrent,
                next  && styles.statusRowNext,
                !next && !curr && styles.statusRowInactive,
              ]}
              onPress={() => next ? void advanceStatus(s) : undefined}
              disabled={!next || loading}
            >
              <View style={[
                styles.statusDot,
                done && styles.statusDotDone,
                curr && styles.statusDotCurrent,
                next && styles.statusDotNext,
              ]}>
                <Text style={styles.statusDotText}>{done ? "✓" : meta.icon}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[
                  styles.statusLabel,
                  done && { color: "#2E7D32" },
                  curr && { color: "#B83232", fontWeight: "800" },
                  next && { color: colors.textPrimary },
                ]}>
                  {meta.label}
                </Text>
                {curr && (
                  <Text style={styles.statusCurrent}>Current status</Text>
                )}
                {next && (
                  <Text style={styles.statusNext}>Tap to advance →</Text>
                )}
              </View>
              {loading && next && <ActivityIndicator size="small" color={colors.accent} />}
            </Pressable>
          );
        })}
      </View>

      {/* FIX 6: Transport button */}
      {status === "claimed" && (
        <Pressable
          style={styles.transportTrigger}
          onPress={() => setShowTransport((p) => !p)}
        >
          <Text style={styles.transportTriggerText}>
            🚗 {showTransport ? "Hide" : "I don't have a vehicle — request transport"}
          </Text>
        </Pressable>
      )}

      {showTransport && (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Request transport</Text>
          <Text style={styles.cardSub}>Fixed pricing — funded from case pool</Text>
          {TRANSPORT_SLABS.map((slab) => (
            <Pressable
              key={slab.id}
              style={[
                styles.slabRow,
                selectedSlab === slab.id && styles.slabRowSelected,
              ]}
              onPress={() => setSelectedSlab(slab.id)}
            >
              <Text style={styles.slabVehicle}>{slab.vehicle}</Text>
              <Text style={styles.slabLabel}>{slab.label}</Text>
              <Text style={styles.slabAmount}>₹{slab.amount}</Text>
            </Pressable>
          ))}
          <Pressable
            style={[styles.slabSubmit, !selectedSlab && { opacity: 0.4 }]}
            onPress={() => void requestTransport()}
            disabled={!selectedSlab}
          >
            <Text style={styles.slabSubmitText}>Request this vehicle</Text>
          </Pressable>
        </View>
      )}

      {/* FIX 5: Nearby clinics */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Nearby stray-accepting clinics</Text>
        {status === "at_hospital" && (
          <Text style={styles.cardSub}>Select the clinic you're going to</Text>
        )}
        {clinicsLoading ? (
          <ActivityIndicator size="small" color={colors.accent} style={{ marginVertical: 12 }} />
        ) : clinics.length === 0 ? (
          <View style={styles.clinicFallback}>
            <Text style={styles.clinicFallbackText}>
              Clinic list unavailable. Call Blue Cross: 044-22351006 (24/7)
            </Text>
          </View>
        ) : (
          clinics.slice(0, 5).map((clinic) => (
            <Pressable
              key={clinic.id}
              style={[
                styles.clinicRow,
                selectedClinic === clinic.id && styles.clinicRowSelected,
              ]}
              onPress={() => status === "at_hospital" && setSelectedClinic(clinic.id)}
            >
              <View style={{ flex: 1 }}>
                <View style={styles.clinicHeader}>
                  <Text style={styles.clinicName} numberOfLines={1}>{clinic.name}</Text>
                  {clinic.emergency24hr && (
                    <View style={styles.badge24hr}>
                      <Text style={styles.badge24hrText}>24hr</Text>
                    </View>
                  )}
                </View>
                <Text style={styles.clinicAddress} numberOfLines={1}>{clinic.address}</Text>
                <Text style={styles.clinicPhone}>{clinic.phone ?? "Call ahead"}</Text>
              </View>
              <Text style={styles.clinicDist}>{clinic.distanceKm?.toFixed(1)} km</Text>
            </Pressable>
          ))
        )}

        {/* Always show Blue Cross as fallback */}
        {clinics.length > 0 && (
          <View style={styles.helplineInline}>
            <Text style={styles.helplineInlineText}>🏥 Blue Cross rescue: 044-22351006 · 24/7</Text>
          </View>
        )}
      </View>

      {/* Abandon */}
      {status !== "completed" && (
        <Pressable style={styles.abandonButton} onPress={abandonCase}>
          <Text style={styles.abandonText}>I can't continue — release this case</Text>
        </Pressable>
      )}

      {status === "completed" && (
        <View style={styles.completedCard}>
          <Text style={styles.completedTitle}>✅ Case completed</Text>
          <Text style={styles.completedSub}>
            The reporter has been notified. Thank you for helping this animal.
          </Text>
          <Pressable style={styles.homeButton} onPress={() => navigation.navigate("HomeMap")}>
            <Text style={styles.homeButtonText}>Back to Home</Text>
          </Pressable>
        </View>
      )}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  content: { padding: 16, gap: 14, paddingBottom: 40 },

  caseCard: {
    backgroundColor: "#FDEAEA",
    borderRadius: 18,
    padding: 16,
    borderWidth: 1.5,
    borderColor: "#B8323228",
    gap: 4,
  },
  casePriority: { fontSize: 11, fontWeight: "800", color: "#B83232", letterSpacing: 0.7, textTransform: "uppercase" },
  caseTitle:    { fontSize: 16, fontWeight: "700", color: "#1C1816" },
  caseCoords:   { fontSize: 12, color: "#8A837A" },

  timerCard: {
    backgroundColor: "#1C1816",
    borderRadius: 18,
    padding: 18,
    alignItems: "center",
    gap: 6,
  },
  timerLabel: { fontSize: 11, fontWeight: "600", color: "rgba(255,255,255,.5)", textTransform: "uppercase", letterSpacing: .8 },
  timerValue: { fontSize: 50, fontWeight: "800", color: "#fff", letterSpacing: -1 },
  timerSub:   { fontSize: 11, color: "rgba(255,255,255,.45)", textAlign: "center" },

  card: { backgroundColor: colors.surface, borderRadius: 18, padding: 16, gap: 10 },
  cardTitle: { fontSize: 14, fontWeight: "700", color: colors.textPrimary },
  cardSub:   { fontSize: 12, color: colors.textSecondary, marginTop: -4 },

  statusRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  statusRowCurrent: {},
  statusRowNext:    { opacity: 1 },
  statusRowInactive:{ opacity: 0.45 },
  statusDot: {
    width: 32, height: 32, borderRadius: 16,
    backgroundColor: colors.surfaceMuted,
    alignItems: "center", justifyContent: "center",
    flexShrink: 0,
  },
  statusDotDone:    { backgroundColor: "#2E7D32" },
  statusDotCurrent: { backgroundColor: "#B83232" },
  statusDotNext:    { backgroundColor: colors.accent },
  statusDotText:    { fontSize: 14 },
  statusLabel:  { fontSize: 13, fontWeight: "600", color: colors.textSecondary },
  statusCurrent:{ fontSize: 11, color: "#B83232", fontWeight: "600", marginTop: 2 },
  statusNext:   { fontSize: 11, color: colors.accent, fontWeight: "600", marginTop: 2 },

  transportTrigger: {
    backgroundColor: colors.surface,
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: "center",
  },
  transportTriggerText: { fontSize: 14, fontWeight: "600", color: colors.accent },

  slabRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    padding: 12,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  slabRowSelected: { borderColor: colors.accent, backgroundColor: "#F5E8E1" },
  slabVehicle: { fontSize: 22 },
  slabLabel:   { flex: 1, fontSize: 13, color: colors.textPrimary, fontWeight: "500" },
  slabAmount:  { fontSize: 16, fontWeight: "800", color: colors.textPrimary },
  slabSubmit:  {
    backgroundColor: colors.accent,
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: "center",
    marginTop: 4,
  },
  slabSubmitText: { color: "#fff", fontWeight: "700", fontSize: 14 },

  clinicRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.background,
  },
  clinicRowSelected: { borderColor: colors.accent, backgroundColor: "#F5E8E1" },
  clinicHeader: { flexDirection: "row", alignItems: "center", gap: 6 },
  clinicName:   { fontSize: 13, fontWeight: "700", color: colors.textPrimary, flex: 1 },
  clinicAddress:{ fontSize: 11, color: colors.textSecondary, marginTop: 2 },
  clinicPhone:  { fontSize: 12, color: colors.accent, fontWeight: "600", marginTop: 2 },
  clinicDist:   { fontSize: 13, fontWeight: "700", color: "#2E7D32", minWidth: 44, textAlign: "right" },
  badge24hr: {
    backgroundColor: "#E8F5E9",
    borderRadius: 6,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  badge24hrText: { fontSize: 10, fontWeight: "700", color: "#2E7D32" },
  clinicFallback: {
    backgroundColor: "#E8EEFA",
    borderRadius: 10,
    padding: 12,
  },
  clinicFallbackText: { fontSize: 13, color: "#2B5FA0", fontWeight: "600" },
  helplineInline: {
    backgroundColor: "#E8F5E9",
    borderRadius: 10,
    padding: 10,
  },
  helplineInlineText: { fontSize: 12, color: "#2E7D32", fontWeight: "600" },

  abandonButton: {
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: "#B83232",
    alignItems: "center",
  },
  abandonText: { fontSize: 14, color: "#B83232", fontWeight: "600" },

  completedCard: {
    backgroundColor: "#E8F5E9",
    borderRadius: 18,
    padding: 20,
    alignItems: "center",
    gap: 10,
  },
  completedTitle: { fontSize: 20, fontWeight: "800", color: "#2E7D32" },
  completedSub:   { fontSize: 13, color: "#2E7D32", textAlign: "center", lineHeight: 20 },
  homeButton: {
    backgroundColor: "#2E7D32",
    borderRadius: 14,
    paddingVertical: 14,
    paddingHorizontal: 32,
    marginTop: 4,
  },
  homeButtonText: { color: "#fff", fontWeight: "700", fontSize: 15 },
});

export default EmergencyResponderScreen;
