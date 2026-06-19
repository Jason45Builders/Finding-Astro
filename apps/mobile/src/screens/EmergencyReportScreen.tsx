/**
 * EmergencyReportScreen.tsx
 *
 * FIXES APPLIED:
 *   FIX 1 — No login required. Guest users can report. Phone number collected inline
 *            if not logged in, submitted with the case for follow-up.
 *   FIX 2 — Text is optional. Photo + auto GPS is enough to submit.
 *            "Submit with just a photo" path is the default.
 *   FIX 3 — Priority is always HIGH for this screen (injured animal emergency).
 *            No more medium priority for rescue cases.
 *   FIX 4 — Camera button is front and centre. Photo picker fully wired to
 *            mobileMediaService. No URL inputs. One tap → camera → submit.
 */

import { useState, useCallback } from "react";
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useAppSelector } from "../store";
import { useLocation } from "../hooks/useLocation";
import { mobileMediaService } from "../services/media.service";
import { apiRequest } from "../services/api";
import { AppStackParamList } from "../navigation/AppNavigator";
import { colors } from "../theme/colors";
import { typography } from "../theme/typography";

type Props = NativeStackScreenProps<AppStackParamList, "EmergencyReport">;

type Severity = "critical" | "serious" | "stable_needs_care";

const SEVERITY_OPTIONS: { value: Severity; label: string; sub: string; color: string }[] = [
  { value: "critical",          label: "Critical",          sub: "Not moving / unconscious / severe bleeding", color: "#B83232" },
  { value: "serious",           label: "Serious",           sub: "Injured but responsive, limping, in pain",   color: "#C47B18" },
  { value: "stable_needs_care", label: "Needs care",        sub: "Sick / malnourished / distressed",           color: "#2B5FA0" },
];

const ANIMAL_TYPES = ["Dog", "Cat", "Other"];

const EmergencyReportScreen = ({ navigation }: Props) => {
  const token = useAppSelector((s) => s.auth.session?.token);
  const isGuest = !token;

  const { currentLocation } = useLocation();

  // Form state
  const [severity,    setSeverity]    = useState<Severity>("serious");
  const [animalType,  setAnimalType]  = useState("Dog");
  const [notes,       setNotes]       = useState("");
  const [guestPhone,  setGuestPhone]  = useState("");
  const [photoUrls,   setPhotoUrls]   = useState<string[]>([]);
  const [uploading,   setUploading]   = useState(false);
  const [submitting,  setSubmitting]  = useState(false);

  // FIX 4: Camera / gallery picker wired to real upload service
  const pickPhoto = useCallback(async (source: "camera" | "gallery") => {
    if (uploading) return;
    if (photoUrls.length >= 3) {
      Alert.alert("Limit reached", "You can attach up to 3 photos per emergency report.");
      return;
    }

    setUploading(true);
    try {
      // Guest mode: use a temporary anonymous token from the server OR upload without auth
      const uploadToken = token ?? undefined;
      const uploaded = await mobileMediaService.pickAndUpload(uploadToken, {
        purpose: "evidence",
        linkedCaseId: null,
        source,
      });
      if (uploaded) {
        setPhotoUrls((prev) => [...prev, uploaded.cdnUrl]);
      }
    } catch (err) {
      Alert.alert(
        "Photo failed",
        err instanceof Error ? err.message : "Could not attach photo. You can still submit without one."
      );
    } finally {
      setUploading(false);
    }
  }, [token, photoUrls.length, uploading]);

  const removePhoto = (url: string) => setPhotoUrls((prev) => prev.filter((u) => u !== url));

  // FIX 1 + 2 + 3: Submit without login, text optional, always HIGH priority
  const submit = async () => {
    if (isGuest && !guestPhone.trim()) {
      Alert.alert("Phone number needed", "Please enter your phone number so the responder can contact you if needed.");
      return;
    }

    setSubmitting(true);
    try {
      // Build title from severity and animal type — no typing needed from user
      const severityLabel = SEVERITY_OPTIONS.find(s => s.value === severity)!.label;
      const title         = `${severityLabel} — ${animalType} needs help`;
      const description   = notes.trim() || `${animalType} spotted ${severity === "critical" ? "unresponsive" : "injured or distressed"}. Auto-reported from Finding Astro.`;

      const body: Record<string, unknown> = {
        caseType:     "rescue",
        title,
        description,
        priority:     "high",           // FIX 3: always high for emergency screen
        locationText: `${currentLocation.latitude.toFixed(5)}, ${currentLocation.longitude.toFixed(5)}`,
        evidenceUrls: photoUrls,
        location: {
          latitude:  currentLocation.latitude,
          longitude: currentLocation.longitude,
        },
        // Severity metadata stored in description prefix for backend parsing
        severity,
        animalType,
      };

      // FIX 1: Guest mode — include phone for follow-up, no auth header
      if (isGuest) {
        body.guestPhone = guestPhone.trim();
      }

      const created = await apiRequest<{ id: string; notifiedCount?: number }>(
        "/cases",
        {
          method:   "POST",
          body,
          // FIX 1: skipAuth for guest, token for logged-in user
          skipAuth: isGuest,
          token:    isGuest ? undefined : token ?? undefined,
        }
      );

      navigation.replace("CaseSubmitted", {
        caseId:        created.id,
        notifiedCount: created.notifiedCount ?? 0,
        priority:      "high",
      });

    } catch (err) {
      Alert.alert(
        "Submission failed",
        err instanceof Error ? err.message : "Please try again."
      );
    } finally {
      setSubmitting(false);
    }
  };

  const canSubmit = !submitting && !uploading && (isGuest ? guestPhone.trim().length >= 10 : true);

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <ScrollView
        style={styles.screen}
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Animal Emergency</Text>
          <Text style={styles.headerSub}>
            Location is auto-detected. Photo is enough — no typing required.
          </Text>
        </View>

        {/* FIX 1: Guest notice */}
        {isGuest && (
          <View style={styles.guestCard}>
            <Text style={styles.guestTitle}>You can report without logging in ✓</Text>
            <Text style={styles.guestBody}>
              Enter your phone number below so the responder can reach you. That's it.
            </Text>
            <TextInput
              style={styles.input}
              placeholder="+91 XXXXX XXXXX"
              placeholderTextColor={colors.textSecondary}
              value={guestPhone}
              onChangeText={setGuestPhone}
              keyboardType="phone-pad"
              maxLength={14}
              returnKeyType="done"
            />
          </View>
        )}

        {/* Severity selector — FIX 3: communicates urgency to backend */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>How bad is it?</Text>
          {SEVERITY_OPTIONS.map((opt) => (
            <Pressable
              key={opt.value}
              style={[
                styles.severityRow,
                severity === opt.value && { borderColor: opt.color, backgroundColor: opt.color + "10" },
              ]}
              onPress={() => setSeverity(opt.value)}
            >
              <View style={[styles.severityDot, { backgroundColor: opt.color }]} />
              <View style={{ flex: 1 }}>
                <Text style={[styles.severityLabel, severity === opt.value && { color: opt.color }]}>
                  {opt.label}
                </Text>
                <Text style={styles.severitySub}>{opt.sub}</Text>
              </View>
              {severity === opt.value && (
                <Text style={[styles.checkmark, { color: opt.color }]}>✓</Text>
              )}
            </Pressable>
          ))}
        </View>

        {/* Animal type */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>Animal type</Text>
          <View style={styles.chipRow}>
            {ANIMAL_TYPES.map((t) => (
              <Pressable
                key={t}
                style={[styles.chip, animalType === t && styles.chipActive]}
                onPress={() => setAnimalType(t)}
              >
                <Text style={[styles.chipText, animalType === t && styles.chipTextActive]}>{t}</Text>
              </Pressable>
            ))}
          </View>
        </View>

        {/* FIX 4: Photo section — camera front and centre */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>Add a photo (optional but helpful)</Text>
          <View style={styles.photoRow}>
            <Pressable
              style={[styles.photoButton, uploading && styles.photoButtonDisabled]}
              onPress={() => void pickPhoto("camera")}
              disabled={uploading}
            >
              {uploading ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <>
                  <Text style={styles.photoButtonIcon}>📷</Text>
                  <Text style={styles.photoButtonText}>Camera</Text>
                </>
              )}
            </Pressable>
            <Pressable
              style={[styles.photoButtonSecondary, uploading && styles.photoButtonDisabled]}
              onPress={() => void pickPhoto("gallery")}
              disabled={uploading}
            >
              <Text style={styles.photoButtonIcon}>🖼️</Text>
              <Text style={styles.photoButtonTextSecondary}>Gallery</Text>
            </Pressable>
          </View>
          {photoUrls.length > 0 && (
            <View style={styles.photoList}>
              {photoUrls.map((url, i) => (
                <View key={url} style={styles.photoTag}>
                  <Text style={styles.photoTagText}>Photo {i + 1} ✓</Text>
                  <Pressable onPress={() => removePhoto(url)} hitSlop={8}>
                    <Text style={styles.photoTagRemove}>✕</Text>
                  </Pressable>
                </View>
              ))}
            </View>
          )}
        </View>

        {/* FIX 2: Notes field is optional — label says so clearly */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>Any extra details? (optional)</Text>
          <TextInput
            style={[styles.input, styles.inputMulti]}
            placeholder="Where exactly? What happened? Condition? Leave blank if too rushed."
            placeholderTextColor={colors.textSecondary}
            value={notes}
            onChangeText={setNotes}
            multiline
            numberOfLines={3}
            textAlignVertical="top"
          />
        </View>

        {/* Auto-detected location confirmation */}
        <View style={styles.locationCard}>
          <Text style={styles.locationIcon}>📍</Text>
          <View style={{ flex: 1 }}>
            <Text style={styles.locationTitle}>Auto-detected location</Text>
            <Text style={styles.locationCoords}>
              {currentLocation.latitude.toFixed(5)}, {currentLocation.longitude.toFixed(5)}
            </Text>
          </View>
        </View>

        {/* What happens next — sets expectations */}
        <View style={styles.infoCard}>
          <Text style={styles.infoTitle}>What happens when you submit:</Text>
          {[
            "Volunteers within 3 km are alerted instantly",
            "NGOs within 8 km are notified as backup",
            "Radius expands automatically if no one responds in 8 min",
            "You will receive live updates from the responder",
          ].map((line) => (
            <Text key={line} style={styles.infoLine}>• {line}</Text>
          ))}
        </View>

        {/* Submit */}
        <Pressable
          style={[styles.submitButton, !canSubmit && styles.submitButtonDisabled]}
          onPress={() => void submit()}
          disabled={!canSubmit}
        >
          {submitting ? (
            <ActivityIndicator color="#fff" size="small" />
          ) : (
            <Text style={styles.submitText}>
              {photoUrls.length > 0 ? "🚨 Send Emergency Alert" : "🚨 Send Alert (location only)"}
            </Text>
          )}
        </Pressable>

        <Text style={styles.footer}>
          This alert is sent to real people nearby. Please only use for genuine emergencies.
        </Text>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const RED  = "#B83232";
const REDL = "#FDEAEA";

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  content: { padding: 18, gap: 18, paddingBottom: 40 },

  header: { gap: 6 },
  headerTitle: { fontSize: 22, fontWeight: "800", color: RED },
  headerSub: { ...typography.body, color: colors.textSecondary, lineHeight: 20 },

  guestCard: {
    backgroundColor: "#E8F5E9",
    borderRadius: 16,
    padding: 16,
    gap: 8,
    borderWidth: 1,
    borderColor: "#2E7D3220",
  },
  guestTitle: { fontSize: 14, fontWeight: "700", color: "#2E7D32" },
  guestBody:  { ...typography.body, color: colors.textSecondary, lineHeight: 18 },

  section: { gap: 10 },
  sectionLabel: {
    fontSize: 12,
    fontWeight: "700",
    color: colors.textSecondary,
    textTransform: "uppercase",
    letterSpacing: 0.7,
  },

  severityRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: colors.surface,
    borderRadius: 14,
    padding: 14,
    borderWidth: 1.5,
    borderColor: colors.border,
  },
  severityDot: { width: 10, height: 10, borderRadius: 5 },
  severityLabel: { fontSize: 15, fontWeight: "700", color: colors.textPrimary },
  severitySub: { fontSize: 12, color: colors.textSecondary, marginTop: 2 },
  checkmark: { fontSize: 16, fontWeight: "700" },

  chipRow: { flexDirection: "row", gap: 10 },
  chip: {
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 999,
    backgroundColor: colors.surfaceMuted,
    borderWidth: 1,
    borderColor: colors.border,
  },
  chipActive: { backgroundColor: RED, borderColor: RED },
  chipText: { fontSize: 14, fontWeight: "600", color: colors.textPrimary },
  chipTextActive: { color: "#fff" },

  photoRow: { flexDirection: "row", gap: 10 },
  photoButton: {
    flex: 1,
    backgroundColor: RED,
    borderRadius: 16,
    paddingVertical: 18,
    alignItems: "center",
    gap: 6,
  },
  photoButtonSecondary: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: 16,
    paddingVertical: 18,
    alignItems: "center",
    gap: 6,
    borderWidth: 1,
    borderColor: colors.border,
  },
  photoButtonDisabled: { opacity: 0.5 },
  photoButtonIcon: { fontSize: 24 },
  photoButtonText: { fontSize: 13, fontWeight: "700", color: "#fff" },
  photoButtonTextSecondary: { fontSize: 13, fontWeight: "600", color: colors.textPrimary },
  photoList: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  photoTag: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#E8F5E9",
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  photoTagText: { fontSize: 12, color: "#2E7D32", fontWeight: "600" },
  photoTagRemove: { fontSize: 12, color: colors.textSecondary },

  input: {
    backgroundColor: colors.surface,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 14,
    paddingVertical: 13,
    fontSize: 14,
    color: colors.textPrimary,
  },
  inputMulti: { minHeight: 90, textAlignVertical: "top" },

  locationCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: colors.surfaceMuted,
    borderRadius: 14,
    padding: 14,
  },
  locationIcon: { fontSize: 20 },
  locationTitle: { fontSize: 12, fontWeight: "700", color: colors.textPrimary },
  locationCoords: { fontSize: 11, color: colors.textSecondary, marginTop: 2 },

  infoCard: {
    backgroundColor: "#E8EEFA",
    borderRadius: 14,
    padding: 14,
    gap: 7,
  },
  infoTitle: { fontSize: 13, fontWeight: "700", color: "#2B5FA0" },
  infoLine:  { fontSize: 12, color: "#2B5FA0", lineHeight: 18 },

  submitButton: {
    backgroundColor: RED,
    borderRadius: 18,
    paddingVertical: 18,
    alignItems: "center",
    shadowColor: RED,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 8,
    elevation: 6,
  },
  submitButtonDisabled: { backgroundColor: colors.surfaceMuted, shadowOpacity: 0, elevation: 0 },
  submitText: { color: "#fff", fontSize: 17, fontWeight: "800", letterSpacing: 0.3 },

  footer: {
    textAlign: "center",
    fontSize: 11,
    color: colors.textSecondary,
    lineHeight: 16,
  },
});

export default EmergencyReportScreen;
