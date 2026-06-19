import { useMemo, useState } from "react";
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View
} from "react-native";
import { useAuth } from "../hooks/useAuth";
import { colors } from "../theme/colors";
import { typography } from "../theme/typography";
import { validateOtp, validatePhone, validateRequired } from "../utils/validators";

const onboardingHighlights = [
  "Track community animals with location-aware memory records.",
  "Report lost pets, sightings, rescue cases, and conflicts fast.",
  "Receive accountability updates from citizens, NGOs, and responders."
];

const OnboardingScreen = () => {
  const { otpPhone, lastMockOtp, error, requestOtp, verifyOtp } = useAuth();
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [otpCode, setOtpCode] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const submitPhone = async () => {
    const nameError = validateRequired(fullName, "Full name");
    const phoneError = validatePhone(phone);

    if (nameError || phoneError) {
      Alert.alert("Validation", nameError ?? phoneError ?? "Please review the form.");
      return;
    }

    setSubmitting(true);

    try {
      const result = await requestOtp(phone, fullName);
      Alert.alert(
        "OTP requested",
        result.code
          ? `Mock OTP for local testing: ${result.code}`
          : "Check your registered SMS inbox for the login code."
      );
    } catch (requestError) {
      Alert.alert("Request failed", requestError instanceof Error ? requestError.message : "Unable to request OTP.");
    } finally {
      setSubmitting(false);
    }
  };

  const submitOtp = async () => {
    const validationError = validateOtp(otpCode);

    if (validationError) {
      Alert.alert("Validation", validationError);
      return;
    }

    setSubmitting(true);

    try {
      await verifyOtp(otpPhone ?? phone, otpCode);
    } catch (verificationError) {
      Alert.alert(
        "Verification failed",
        verificationError instanceof Error ? verificationError.message : "Unable to verify OTP."
      );
    } finally {
      setSubmitting(false);
    }
  };

  const ctaLabel = useMemo(() => (otpPhone ? "Verify OTP" : "Request OTP"), [otpPhone]);

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <ScrollView contentContainerStyle={styles.container}>
        <Text style={styles.kicker}>Citizen platform for animal welfare</Text>
        <Text style={styles.title}>Build memory, not chaos.</Text>
        <Text style={styles.subtitle}>
          Finding Astro helps communities document animals, escalate urgent cases, and recover lost pets with location-based evidence.
        </Text>

        <View style={styles.highlightList}>
          {onboardingHighlights.map((item) => (
            <View key={item} style={styles.highlightCard}>
              <Text style={styles.highlightText}>{item}</Text>
            </View>
          ))}
        </View>

        <View style={styles.form}>
          <Text style={styles.sectionTitle}>Sign in with OTP</Text>

          {!otpPhone ? (
            <>
              <TextInput
                value={fullName}
                onChangeText={setFullName}
                placeholder="Full name"
                placeholderTextColor={colors.textSecondary}
                style={styles.input}
              />
              <TextInput
                value={phone}
                onChangeText={setPhone}
                placeholder="Phone number"
                keyboardType="phone-pad"
                placeholderTextColor={colors.textSecondary}
                style={styles.input}
              />
            </>
          ) : (
            <>
              <Text style={styles.helperText}>Code sent to {otpPhone}</Text>
              {lastMockOtp ? <Text style={styles.mockCode}>Mock code: {lastMockOtp}</Text> : null}
              <TextInput
                value={otpCode}
                onChangeText={setOtpCode}
                placeholder="6-digit OTP"
                keyboardType="number-pad"
                placeholderTextColor={colors.textSecondary}
                style={styles.input}
              />
            </>
          )}

          {error ? <Text style={styles.errorText}>{error}</Text> : null}

          <Pressable style={styles.button} onPress={otpPhone ? submitOtp : submitPhone} disabled={submitting}>
            <Text style={styles.buttonText}>{submitting ? "Please wait..." : ctaLabel}</Text>
          </Pressable>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  flex: {
    flex: 1,
    backgroundColor: colors.background
  },
  container: {
    padding: 24,
    gap: 18
  },
  kicker: {
    ...typography.caption,
    color: colors.accentDeep,
    letterSpacing: 1.2,
    textTransform: "uppercase"
  },
  title: {
    ...typography.title,
    color: colors.textPrimary
  },
  subtitle: {
    ...typography.body,
    color: colors.textSecondary,
    lineHeight: 22
  },
  highlightList: {
    gap: 12
  },
  highlightCard: {
    backgroundColor: colors.surfaceMuted,
    borderRadius: 18,
    padding: 16
  },
  highlightText: {
    ...typography.body,
    color: colors.textPrimary
  },
  form: {
    backgroundColor: colors.surface,
    borderRadius: 24,
    padding: 20,
    gap: 12,
    shadowColor: colors.shadow,
    shadowOpacity: 1,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 8 },
    elevation: 4
  },
  sectionTitle: {
    ...typography.heading,
    color: colors.textPrimary
  },
  helperText: {
    ...typography.body,
    color: colors.textSecondary
  },
  mockCode: {
    ...typography.subheading,
    color: colors.accentDeep
  },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 14,
    color: colors.textPrimary,
    backgroundColor: colors.background
  },
  button: {
    backgroundColor: colors.accent,
    paddingVertical: 15,
    borderRadius: 16,
    alignItems: "center",
    marginTop: 8
  },
  buttonText: {
    color: colors.surface,
    fontWeight: "700",
    fontSize: 15
  },
  errorText: {
    ...typography.body,
    color: colors.danger
  }
});

export default OnboardingScreen;
