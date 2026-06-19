import { useState } from "react";
import {
  ActivityIndicator, Alert, Pressable, ScrollView, StyleSheet, Text, View,
} from "react-native";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useAppSelector } from "../store";
import { useLocation } from "../hooks/useLocation";
import { apiRequest } from "../services/api";
import { mobileMediaService } from "../services/media.service";
import { AppStackParamList } from "../navigation/AppNavigator";
import { colors } from "../theme/colors";

type Props = NativeStackScreenProps<AppStackParamList, "Wildlife">;

const SPECIES = [
  { id:"snake",   label:"Snake",           icon:"🐍", risk:"critical", color:"#B83232",
    guidance:"Keep at least 3 metres distance. Do not corner. Keep people and pets away. Wait for trained responder.",
    doNot:"Do NOT pick it up, trap it, or pour water on it." },
  { id:"bird",    label:"Bird / Raptor",   icon:"🦅", risk:"medium",   color:"#2B5FA0",
    guidance:"If grounded and injured, place a ventilated cardboard box nearby. Do not handle.",
    doNot:"Do NOT feed, give water, or place in direct sunlight." },
  { id:"monkey",  label:"Monkey",          icon:"🐒", risk:"high",     color:"#C47B18",
    guidance:"No eye contact. No food. Keep children away. Do not approach.",
    doNot:"Do NOT touch, feed, or restrain. Primates bite." },
  { id:"reptile", label:"Lizard / Monitor",icon:"🦎", risk:"high",     color:"#6B3FA0",
    guidance:"Keep distance. If indoors, close other doors to contain it in one room.",
    doNot:"Do NOT hit or grab by the tail." },
  { id:"mammal",  label:"Other Mammal",    icon:"🦊", risk:"high",     color:"#1E7B68",
    guidance:"Keep distance. Note size and colour. Wait for authorised wildlife rescuer.",
    doNot:"Do NOT approach injured wild mammals — they bite when in pain." },
  { id:"other",   label:"Unknown",         icon:"❓", risk:"high",     color:"#8A837A",
    guidance:"Keep everyone away. Note as many details as possible. Wait for responder.",
    doNot:"Do NOT handle unknown wildlife." },
];

const CONDITIONS = [
  { id:"injured",      label:"Injured",           priority:"high"   },
  { id:"trapped",      label:"Trapped",            priority:"high"   },
  { id:"in_building",  label:"Inside a building",  priority:"high"   },
  { id:"sighted_only", label:"Just sighted",        priority:"medium" },
];

const WildlifeScreen = ({ navigation }: Props) => {
  const token = useAppSelector((s) => s.auth.session?.token);
  const { currentLocation } = useLocation();

  const [species,    setSpecies]    = useState<typeof SPECIES[0] | null>(null);
  const [condition,  setCondition]  = useState<typeof CONDITIONS[0] | null>(null);
  const [photoUrls,  setPhotoUrls]  = useState<string[]>([]);
  const [uploading,  setUploading]  = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitted,  setSubmitted]  = useState(false);

  const pickPhoto = async () => {
    if (uploading || photoUrls.length >= 2) return;
    setUploading(true);
    try {
      const up = await mobileMediaService.pickAndUpload(token, { purpose:"evidence", source:"camera" });
      if (up) setPhotoUrls((p) => [...p, up.cdnUrl]);
    } catch { /* non-fatal */ } finally { setUploading(false); }
  };

  const submit = async () => {
    if (!species || !condition) {
      Alert.alert("Select animal and situation", "Choose what you saw and its situation first.");
      return;
    }
    setSubmitting(true);
    try {
      await apiRequest("/wildlife/report", {
        method:"POST", token: token ?? undefined,
        body:{
          speciesCategory: species.id, condition: condition.id,
          description:`${species.label} — ${condition.label}`,
          location:{ latitude:currentLocation.latitude, longitude:currentLocation.longitude },
          photoUrls,
        },
      });
      setSubmitted(true);
    } catch (err) {
      Alert.alert("Submission failed", err instanceof Error ? err.message : "Please try again.");
    } finally { setSubmitting(false); }
  };

  if (submitted) return (
    <View style={s.submitted}>
      <Text style={s.submittedIcon}>{species?.icon ?? "🦎"}</Text>
      <Text style={s.submittedTitle}>Wildlife rescue filed</Text>
      <Text style={s.submittedBody}>
        Only authorised, trained wildlife responders have been notified. General volunteers are excluded from this alert.
      </Text>
      <Text style={s.submittedSub}>
        Nearest wildlife centre: TNFD Chennai — 044-24310972
      </Text>
      <Pressable style={s.backBtn} onPress={() => navigation.navigate("HomeMap")}>
        <Text style={s.backBtnText}>Back to Home</Text>
      </Pressable>
    </View>
  );

  return (
    <ScrollView style={s.screen} contentContainerStyle={s.content}>
      <View style={s.infoCard}>
        <Text style={s.infoTitle}>Different protocol — authorised responders only</Text>
        <Text style={s.infoBody}>
          Wildlife guidance is shown to you immediately. Only trained, authorised wildlife responders receive the alert — not general volunteers. Never routed to local vets.
        </Text>
      </View>

      <Text style={s.sectionLabel}>What did you see?</Text>
      <View style={s.grid}>
        {SPECIES.map((sp) => (
          <Pressable
            key={sp.id}
            style={[s.speciesCard, species?.id === sp.id && { borderColor:sp.color, backgroundColor:sp.color+"15" }]}
            onPress={() => setSpecies(sp)}
          >
            <Text style={s.speciesIcon}>{sp.icon}</Text>
            <Text style={s.speciesLabel}>{sp.label}</Text>
            <Text style={[s.speciesRisk, { color:sp.color }]}>Risk: {sp.risk}</Text>
          </Pressable>
        ))}
      </View>

      {species && (
        <View style={[s.guidanceCard, { borderColor:species.color+"30", backgroundColor:species.color+"08" }]}>
          <Text style={[s.guidanceTitle, { color:species.color }]}>Guidance — read before approaching</Text>
          <Text style={s.guidanceText}>{species.guidance}</Text>
          <View style={s.doNotBox}>
            <Text style={s.doNotTitle}>🚫 Do NOT:</Text>
            <Text style={s.doNotText}>{species.doNot}</Text>
          </View>
        </View>
      )}

      {species && (
        <>
          <Text style={s.sectionLabel}>Situation</Text>
          {CONDITIONS.map((c) => (
            <Pressable
              key={c.id}
              style={[s.condRow, condition?.id === c.id && s.condRowActive]}
              onPress={() => setCondition(c)}
            >
              <Text style={s.condLabel}>{c.label}</Text>
              {c.priority === "high" && <View style={s.urgentBadge}><Text style={s.urgentText}>Urgent</Text></View>}
              {condition?.id === c.id && <Text style={s.condCheck}>✓</Text>}
            </Pressable>
          ))}
        </>
      )}

      {species && (
        <>
          <Text style={s.sectionLabel}>Photo (optional)</Text>
          <Pressable
            style={[s.photoBtn, uploading && { opacity:.5 }]}
            onPress={() => void pickPhoto()}
            disabled={uploading}
          >
            {uploading
              ? <ActivityIndicator color="#fff" size="small" />
              : <Text style={s.photoBtnText}>📷 Take photo</Text>
            }
          </Pressable>
          {photoUrls.map((u, i) => (
            <Text key={u} style={s.photoTag}>Photo {i+1} attached ✓</Text>
          ))}
        </>
      )}

      <View style={s.centresCard}>
        <Text style={s.centresTitle}>Nearest wildlife centres</Text>
        {[
          { name:"TNFD Wildlife Rescue — Chennai", phone:"044-24310972", hours:"9am–6pm" },
          { name:"Blue Cross Wildlife Unit",        phone:"044-22351006", hours:"24 hours" },
        ].map((w) => (
          <View key={w.name} style={s.centreRow}>
            <View style={{ flex:1 }}>
              <Text style={s.centreName}>{w.name}</Text>
              <Text style={s.centreHours}>{w.hours}</Text>
            </View>
            <Text style={s.centrePhone}>{w.phone}</Text>
          </View>
        ))}
      </View>

      <Pressable
        style={[s.submitBtn, (!species || !condition || submitting) && { opacity:.35 }]}
        onPress={() => void submit()}
        disabled={!species || !condition || submitting}
      >
        {submitting
          ? <ActivityIndicator color="#fff" size="small" />
          : <Text style={s.submitBtnText}>File wildlife rescue report</Text>
        }
      </Pressable>
      <Text style={s.footer}>Only wildlife-trained, authorised responders will be notified.</Text>
    </ScrollView>
  );
};

const s = StyleSheet.create({
  screen:{ flex:1, backgroundColor:colors.background },
  content:{ padding:16, gap:13, paddingBottom:40 },
  infoCard:{ backgroundColor:"#F0E8FA", borderRadius:14, padding:14, borderWidth:1, borderColor:"#6B3FA025" },
  infoTitle:{ fontSize:13, fontWeight:"700", color:"#6B3FA0", marginBottom:4 },
  infoBody:{ fontSize:12, color:colors.textSecondary, lineHeight:18 },
  sectionLabel:{ fontSize:11, fontWeight:"700", color:colors.textSecondary, textTransform:"uppercase", letterSpacing:.7 },
  grid:{ flexDirection:"row", flexWrap:"wrap", gap:8 },
  speciesCard:{ width:"47%", backgroundColor:colors.surface, borderRadius:13, padding:12, borderWidth:1.5, borderColor:colors.border, alignItems:"center", gap:3 },
  speciesIcon:{ fontSize:26 },
  speciesLabel:{ fontSize:12, fontWeight:"700", color:colors.textPrimary },
  speciesRisk:{ fontSize:10, fontWeight:"600" },
  guidanceCard:{ borderRadius:14, padding:14, borderWidth:1, gap:8 },
  guidanceTitle:{ fontSize:11, fontWeight:"700", textTransform:"uppercase", letterSpacing:.5 },
  guidanceText:{ fontSize:13, color:colors.textPrimary, lineHeight:20 },
  doNotBox:{ backgroundColor:"#FDEAEA", borderRadius:9, padding:10, borderWidth:1, borderColor:"#B8323225" },
  doNotTitle:{ fontSize:11, fontWeight:"700", color:"#B83232", marginBottom:3 },
  doNotText:{ fontSize:11, color:"#B83232", lineHeight:17 },
  condRow:{ backgroundColor:colors.surface, borderRadius:12, padding:13, borderWidth:1.5, borderColor:colors.border, flexDirection:"row", alignItems:"center", gap:8 },
  condRowActive:{ borderColor:"#6B3FA0", backgroundColor:"#F0E8FA" },
  condLabel:{ flex:1, fontSize:13, fontWeight:"600", color:colors.textPrimary },
  urgentBadge:{ backgroundColor:"#FDEAEA", borderRadius:5, paddingHorizontal:7, paddingVertical:2 },
  urgentText:{ fontSize:10, color:"#B83232", fontWeight:"700" },
  condCheck:{ fontSize:15, color:"#6B3FA0", fontWeight:"700" },
  photoBtn:{ backgroundColor:"#6B3FA0", borderRadius:13, paddingVertical:14, alignItems:"center" },
  photoBtnText:{ color:"#fff", fontWeight:"700", fontSize:14 },
  photoTag:{ fontSize:12, color:"#2E7D32", fontWeight:"600" },
  centresCard:{ backgroundColor:colors.surface, borderRadius:14, padding:14, gap:8 },
  centresTitle:{ fontSize:13, fontWeight:"700", color:colors.textPrimary },
  centreRow:{ flexDirection:"row", alignItems:"center", paddingVertical:7, borderBottomWidth:1, borderBottomColor:colors.border },
  centreName:{ fontSize:12, fontWeight:"600", color:colors.textPrimary },
  centreHours:{ fontSize:11, color:colors.textSecondary, marginTop:1 },
  centrePhone:{ fontSize:12, fontWeight:"700", color:"#1E7B68" },
  submitBtn:{ backgroundColor:"#6B3FA0", borderRadius:15, paddingVertical:16, alignItems:"center" },
  submitBtnText:{ color:"#fff", fontWeight:"800", fontSize:15 },
  footer:{ textAlign:"center", fontSize:11, color:colors.textSecondary },
  submitted:{ flex:1, alignItems:"center", justifyContent:"center", padding:32, backgroundColor:colors.background },
  submittedIcon:{ fontSize:54, marginBottom:13 },
  submittedTitle:{ fontSize:22, fontWeight:"800", color:colors.textPrimary, marginBottom:7, textAlign:"center" },
  submittedBody:{ fontSize:13, color:colors.textSecondary, textAlign:"center", lineHeight:20, marginBottom:7 },
  submittedSub:{ fontSize:12, color:"#1E7B68", fontWeight:"600", textAlign:"center", marginBottom:22 },
  backBtn:{ backgroundColor:colors.surface, borderRadius:13, paddingVertical:13, paddingHorizontal:28, borderWidth:1, borderColor:colors.border },
  backBtnText:{ fontWeight:"700", fontSize:14, color:colors.textPrimary },
});

export default WildlifeScreen;
