/**
 * IdentityVerificationScreen.tsx
 * 
 * Shows the user their current identity tier, what they can and cannot do,
 * and the path to upgrade. This is NOT a blocker screen — it is reached
 * when the user tries to do something that requires a higher tier.
 * 
 * The framing is entirely positive: "unlock more ways to help" not "you are blocked."
 */

import { useState } from "react";
import {
  ActivityIndicator, Alert, Pressable, ScrollView, StyleSheet, Text, TextInput, View,
} from "react-native";
import { useAppSelector } from "../store";
import { apiRequest } from "../services/api";
import { colors } from "../theme/colors";

interface IdentityStatus {
  tier: number;
  tierName: string;
  aadhaarVerified: boolean;
  credibilityScore: number;
  canDo: string[];
  cannotDo: string[];
}

const TIER_CONFIG = [
  {
    tier: 0,
    icon: "📱",
    label: "Phone verified",
    color: "#8A837A",
    bgColor: "#F0EBE1",
    desc: "You can report injured animals — no other steps needed.",
  },
  {
    tier: 1,
    icon: "📝",
    label: "Name registered",
    color: "#2B5FA0",
    bgColor: "#E8EEFA",
    desc: "Your name is on record. You can add animal profiles and claim rescue cases.",
  },
  {
    tier: 2,
    icon: "✅",
    label: "Aadhaar verified",
    color: "#1E7B68",
    bgColor: "#E0F2EE",
    desc: "Full access. Your identity is verified. Abuse reports and adoption applications unlocked.",
  },
];

const IdentityVerificationScreen = () => {
  const token = useAppSelector((s) => s.auth.session?.token);

  const [status, setStatus]               = useState<IdentityStatus | null>(null);
  const [loading, setLoading]             = useState(false);
  const [step, setStep]                   = useState<"view"|"register_name"|"aadhaar_init"|"aadhaar_otp">("view");
  const [fullName, setFullName]           = useState("");
  const [aadhaarNumber, setAadhaarNumber] = useState("");
  const [otp, setOtp]                     = useState("");
  const [requestId, setRequestId]         = useState("");
  const [submitting, setSubmitting]       = useState(false);

  const loadStatus = async () => {
    setLoading(true);
    try {
      const data = await apiRequest<IdentityStatus>("/users/identity/status", { token: token ?? undefined });
      setStatus(data);
    } catch (err) {
      Alert.alert("Could not load status", err instanceof Error ? err.message : "Try again.");
    } finally {
      setLoading(false);
    }
  };

  const registerName = async () => {
    if (fullName.trim().length < 3) {
      Alert.alert("Enter your full name", "At least 3 characters required.");
      return;
    }
    setSubmitting(true);
    try {
      await apiRequest("/users/identity/register-name", {
        method: "POST", token: token ?? undefined,
        body: { fullName: fullName.trim() },
      });
      Alert.alert("Name registered ✓", "You can now claim rescue cases and add animal records.");
      setStep("view");
      void loadStatus();
    } catch (err) {
      Alert.alert("Failed", err instanceof Error ? err.message : "Try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const initiateAadhaar = async () => {
    const clean = aadhaarNumber.replace(/\s+/g, "");
    if (!/^\d{12}$/.test(clean)) {
      Alert.alert("Invalid Aadhaar number", "Please enter your 12-digit Aadhaar number.");
      return;
    }
    setSubmitting(true);
    try {
      const result = await apiRequest<{ requestId: string }>("/users/identity/aadhaar/initiate", {
        method: "POST", token: token ?? undefined,
        body: { aadhaarNumber: clean },
      });
      setRequestId(result.requestId);
      setStep("aadhaar_otp");
    } catch (err) {
      Alert.alert("Failed", err instanceof Error ? err.message : "Try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const verifyAadhaarOtp = async () => {
    if (!/^\d{6}$/.test(otp)) {
      Alert.alert("Enter 6-digit OTP", "Check the SMS sent to your Aadhaar-linked mobile number.");
      return;
    }
    setSubmitting(true);
    try {
      const result = await apiRequest<{ verified: boolean; name: string }>("/users/identity/aadhaar/verify", {
        method: "POST", token: token ?? undefined,
        body: { requestId, otp },
      });
      Alert.alert(
        "Identity verified ✓",
        `Welcome, ${result.name}. You now have full access to file abuse reports, apply for adoptions, and request ABC services.`
      );
      setStep("view");
      void loadStatus();
    } catch (err) {
      Alert.alert("Verification failed", err instanceof Error ? err.message : "Try again.");
    } finally {
      setSubmitting(false);
    }
  };

  // Load on first render
  if (!status && !loading) { void loadStatus(); }

  if (loading) return (
    <View style={s.center}><ActivityIndicator size="large" color={colors.accent} /></View>
  );

  if (step === "register_name") return (
    <ScrollView style={s.screen} contentContainerStyle={s.content}>
      <View style={s.headerCard}>
        <Text style={s.headerIcon}>📝</Text>
        <Text style={s.headerTitle}>Register your name</Text>
        <Text style={s.headerSub}>
          Your name helps build accountability. It is shown to NGOs on cases you file — not to the public.
        </Text>
      </View>
      <TextInput
        style={s.input}
        placeholder="Full name (as you want to be known)"
        placeholderTextColor={colors.textSecondary}
        value={fullName}
        onChangeText={setFullName}
        autoCapitalize="words"
      />
      <Text style={s.privacyNote}>
        Your name is shared with NGOs when you file cases. It is never shown publicly.
      </Text>
      <Pressable
        style={[s.btn, s.btnPrimary, (submitting || fullName.trim().length < 3) && { opacity: 0.4 }]}
        onPress={() => void registerName()}
        disabled={submitting || fullName.trim().length < 3}
      >
        {submitting ? <ActivityIndicator color="#fff" /> : <Text style={s.btnText}>Register name</Text>}
      </Pressable>
      <Pressable onPress={() => setStep("view")}>
        <Text style={s.back}>← Back</Text>
      </Pressable>
    </ScrollView>
  );

  if (step === "aadhaar_init") return (
    <ScrollView style={s.screen} contentContainerStyle={s.content}>
      <View style={s.headerCard}>
        <Text style={s.headerIcon}>✅</Text>
        <Text style={s.headerTitle}>Verify with Aadhaar</Text>
        <Text style={s.headerSub}>
          An OTP will be sent to the mobile number linked with your Aadhaar. We never store your Aadhaar number — only a one-way hash to prevent duplicate accounts.
        </Text>
      </View>
      <View style={s.securityRow}>
        {["Aadhaar number never stored","One-way hash only","UIDAI official OTP","Cannot be reversed"].map(point => (
          <View key={point} style={s.securityItem}>
            <Text style={s.securityIcon}>🔒</Text>
            <Text style={s.securityText}>{point}</Text>
          </View>
        ))}
      </View>
      <TextInput
        style={s.input}
        placeholder="12-digit Aadhaar number"
        placeholderTextColor={colors.textSecondary}
        value={aadhaarNumber}
        onChangeText={setAadhaarNumber}
        keyboardType="number-pad"
        maxLength={12}
        secureTextEntry
      />
      <Text style={s.privacyNote}>
        By verifying, you agree that false reports filed after Aadhaar verification may result in account suspension and the matter being referred to appropriate authorities.
      </Text>
      <Pressable
        style={[s.btn, s.btnGreen, (submitting || aadhaarNumber.replace(/\s/g,"").length !== 12) && { opacity: 0.4 }]}
        onPress={() => void initiateAadhaar()}
        disabled={submitting || aadhaarNumber.replace(/\s/g,"").length !== 12}
      >
        {submitting ? <ActivityIndicator color="#fff" /> : <Text style={s.btnText}>Send OTP to Aadhaar mobile</Text>}
      </Pressable>
      <Pressable onPress={() => setStep("view")}>
        <Text style={s.back}>← Back</Text>
      </Pressable>
    </ScrollView>
  );

  if (step === "aadhaar_otp") return (
    <ScrollView style={s.screen} contentContainerStyle={s.content}>
      <View style={s.headerCard}>
        <Text style={s.headerIcon}>📲</Text>
        <Text style={s.headerTitle}>Enter Aadhaar OTP</Text>
        <Text style={s.headerSub}>
          Enter the 6-digit OTP sent to the mobile number registered with your Aadhaar card.
        </Text>
      </View>
      <TextInput
        style={[s.input, { fontSize: 22, letterSpacing: 6, textAlign: "center" }]}
        placeholder="• • • • • •"
        placeholderTextColor={colors.textSecondary}
        value={otp}
        onChangeText={setOtp}
        keyboardType="number-pad"
        maxLength={6}
      />
      <Pressable
        style={[s.btn, s.btnGreen, (submitting || otp.length !== 6) && { opacity: 0.4 }]}
        onPress={() => void verifyAadhaarOtp()}
        disabled={submitting || otp.length !== 6}
      >
        {submitting ? <ActivityIndicator color="#fff" /> : <Text style={s.btnText}>Verify OTP</Text>}
      </Pressable>
      <Pressable onPress={() => { setStep("aadhaar_init"); setOtp(""); }}>
        <Text style={s.back}>Didn't receive OTP? Try again</Text>
      </Pressable>
    </ScrollView>
  );

  // Default: overview
  return (
    <ScrollView style={s.screen} contentContainerStyle={s.content}>
      <Text style={s.pageTitle}>Your Identity Level</Text>
      <Text style={s.pageSub}>
        Higher identity levels unlock more ways to help animals. Emergency reporting is always open — no verification needed.
      </Text>

      {/* Tier progress */}
      <View style={s.tierTrack}>
        {TIER_CONFIG.map((tc, i) => {
          const current = status?.tier ?? 0;
          const done    = current >= tc.tier;
          const active  = current === tc.tier;
          return (
            <View key={tc.tier} style={s.tierRow}>
              <View style={[s.tierDot, { backgroundColor: done ? tc.color : colors.surfaceMuted }]}>
                <Text style={s.tierDotText}>{done ? "✓" : tc.icon}</Text>
              </View>
              {i < TIER_CONFIG.length - 1 && (
                <View style={[s.tierLine, { backgroundColor: done ? tc.color : colors.border }]} />
              )}
              <View style={[s.tierLabel, active && { backgroundColor: tc.bgColor, borderColor: tc.color }]}>
                <Text style={[s.tierLabelTitle, { color: done ? tc.color : colors.textSecondary }]}>{tc.label}</Text>
                <Text style={s.tierLabelDesc}>{tc.desc}</Text>
              </View>
            </View>
          );
        })}
      </View>

      {/* What you can do */}
      {status && status.canDo.length > 0 && (
        <View style={[s.card, { borderColor: "#1E7B6828" }]}>
          <Text style={[s.cardTitle, { color: "#1E7B68" }]}>✓ What you can do now</Text>
          {status.canDo.map(item => (
            <Text key={item} style={s.can}>• {item}</Text>
          ))}
        </View>
      )}

      {/* What you can't do yet */}
      {status && status.cannotDo.length > 0 && (
        <View style={s.card}>
          <Text style={s.cardTitle}>Unlock more by verifying</Text>
          {status.cannotDo.map(item => (
            <Text key={item} style={s.cannot}>• {item}</Text>
          ))}
        </View>
      )}

      {/* Credibility score */}
      {status && (
        <View style={s.credCard}>
          <Text style={s.credLabel}>Your credibility score</Text>
          <Text style={s.credScore}>{Math.round(status.credibilityScore)}/100</Text>
          <View style={s.credBar}>
            <View style={[s.credFill, { width: `${status.credibilityScore}%` as any }]} />
          </View>
          <Text style={s.credSub}>
            Reports from high-credibility users are broadcast instantly. Verified reports increase your score.
          </Text>
        </View>
      )}

      {/* Upgrade buttons */}
      {status && status.tier < 1 && (
        <Pressable style={[s.btn, s.btnBlue]} onPress={() => setStep("register_name")}>
          <Text style={s.btnText}>Register your name → Tier 1</Text>
        </Pressable>
      )}

      {status && status.tier < 2 && status.tier >= 1 && (
        <Pressable style={[s.btn, s.btnGreen]} onPress={() => setStep("aadhaar_init")}>
          <Text style={s.btnText}>Verify with Aadhaar → Tier 2</Text>
        </Pressable>
      )}

      {status && status.tier >= 2 && !status.aadhaarVerified && (
        <Pressable style={[s.btn, s.btnGreen]} onPress={() => setStep("aadhaar_init")}>
          <Text style={s.btnText}>Verify Aadhaar</Text>
        </Pressable>
      )}

      {/* Always show emergency note */}
      <View style={s.emergNote}>
        <Text style={s.emergText}>
          Emergency animal rescue reports are always open — no login or verification needed.
          Your phone number is collected to allow responders to follow up.
        </Text>
      </View>
    </ScrollView>
  );
};

const s = StyleSheet.create({
  screen: { flex:1, backgroundColor: colors.background },
  content: { padding:16, gap:13, paddingBottom:40 },
  center: { flex:1, alignItems:"center", justifyContent:"center" },
  pageTitle: { fontSize:20, fontWeight:"700", color:colors.textPrimary },
  pageSub: { fontSize:12, color:colors.textSecondary, lineHeight:18 },

  headerCard: { backgroundColor:colors.surface, borderRadius:14, padding:16, alignItems:"center", gap:8 },
  headerIcon: { fontSize:36 },
  headerTitle: { fontSize:18, fontWeight:"700", color:colors.textPrimary },
  headerSub: { fontSize:12, color:colors.textSecondary, textAlign:"center", lineHeight:18 },

  securityRow: { flexDirection:"row", flexWrap:"wrap", gap:8 },
  securityItem: { flexDirection:"row", gap:5, alignItems:"center", width:"48%" },
  securityIcon: { fontSize:12 },
  securityText: { fontSize:11, color:"#1E7B68", fontWeight:"600" },

  tierTrack: { gap:4 },
  tierRow: { flexDirection:"row", gap:10, alignItems:"flex-start" },
  tierDot: { width:36, height:36, borderRadius:18, alignItems:"center", justifyContent:"center", flexShrink:0, marginTop:4 },
  tierDotText: { fontSize:15 },
  tierLine: { position:"absolute", left:17, top:40, width:2, height:20 },
  tierLabel: { flex:1, backgroundColor:colors.surface, borderRadius:12, padding:11, borderWidth:1.5, borderColor:colors.border },
  tierLabelTitle: { fontSize:13, fontWeight:"700", marginBottom:2 },
  tierLabelDesc: { fontSize:11, color:colors.textSecondary, lineHeight:16 },

  card: { backgroundColor:colors.surface, borderRadius:14, padding:14, borderWidth:1, borderColor:colors.border, gap:6 },
  cardTitle: { fontSize:13, fontWeight:"700", color:colors.textPrimary, marginBottom:4 },
  can: { fontSize:12, color:"#1E7B68", lineHeight:18 },
  cannot: { fontSize:12, color:colors.textSecondary, lineHeight:18 },

  credCard: { backgroundColor:colors.surface, borderRadius:14, padding:14, gap:7 },
  credLabel: { fontSize:11, fontWeight:"700", color:colors.textSecondary, textTransform:"uppercase", letterSpacing:.6 },
  credScore: { fontSize:28, fontWeight:"800", color:colors.textPrimary },
  credBar: { height:6, backgroundColor:colors.surfaceMuted, borderRadius:3, overflow:"hidden" },
  credFill: { height:"100%", backgroundColor:"#1E7B68", borderRadius:3 },
  credSub: { fontSize:11, color:colors.textSecondary, lineHeight:16 },

  input: {
    backgroundColor:colors.surface, borderRadius:13, borderWidth:1.5, borderColor:colors.border,
    paddingHorizontal:14, paddingVertical:13, fontSize:15, color:colors.textPrimary,
  },
  privacyNote: { fontSize:11, color:colors.textSecondary, lineHeight:16 },

  btn: { borderRadius:14, paddingVertical:15, alignItems:"center" },
  btnPrimary: { backgroundColor:colors.accent },
  btnBlue: { backgroundColor:"#2B5FA0" },
  btnGreen: { backgroundColor:"#1E7B68" },
  btnText: { color:"#fff", fontWeight:"700", fontSize:14 },
  back: { textAlign:"center", color:colors.accent, fontWeight:"600", fontSize:13, marginTop:4 },

  emergNote: { backgroundColor:"#F0EBE1", borderRadius:12, padding:12 },
  emergText: { fontSize:11, color:colors.textSecondary, lineHeight:17, textAlign:"center" },
});

export default IdentityVerificationScreen;
