import { View, Text, StyleSheet } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { colors, GRADIENT } from "./theme";
import GradientButton from "./components/GradientButton";

const POINTS = [
  { icon: "sparkles", title: "Notes in seconds", body: "Paste a YouTube or article link, text, or a screenshot — get clean notes + a quiz." },
  { icon: "share-social", title: "Share into NoteJet", body: "Send anything from Safari, YouTube, or Photos straight to NoteJet to study it." },
  { icon: "albums", title: "Save & master", body: "Keep decks and run flashcard study sessions to lock the material in." },
];

export default function Onboarding({ onDone }) {
  const insets = useSafeAreaInsets();
  return (
    <View style={[styles.wrap, { paddingTop: insets.top + 40, paddingBottom: insets.bottom + 24 }]}>
      <LinearGradient colors={GRADIENT} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.logo}>
        <Text style={styles.logoText}>N</Text>
      </LinearGradient>
      <Text style={styles.title}>Welcome to NoteJet</Text>
      <Text style={styles.sub}>Turn anything you're studying into notes and a quick quiz.</Text>

      <View style={styles.points}>
        {POINTS.map((p, i) => (
          <View key={i} style={styles.row}>
            <LinearGradient colors={GRADIENT} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.iconWrap}>
              <Ionicons name={p.icon} size={19} color="#fff" />
            </LinearGradient>
            <View style={{ flex: 1 }}>
              <Text style={styles.pTitle}>{p.title}</Text>
              <Text style={styles.pBody}>{p.body}</Text>
            </View>
          </View>
        ))}
      </View>

      <View style={{ flex: 1 }} />
      <GradientButton title="Get started" onPress={onDone} style={{ alignSelf: "stretch" }} />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1, backgroundColor: colors.bg, paddingHorizontal: 24 },
  logo: {
    width: 72, height: 72, borderRadius: 22, alignItems: "center", justifyContent: "center", marginBottom: 22,
    shadowColor: colors.glow, shadowOpacity: 0.6, shadowRadius: 18, shadowOffset: { width: 0, height: 8 },
  },
  logoText: { color: "#fff", fontWeight: "800", fontSize: 40 },
  title: { color: colors.text, fontSize: 30, fontWeight: "800", letterSpacing: -0.5 },
  sub: { color: colors.muted, fontSize: 16, marginTop: 8, lineHeight: 23 },
  points: { marginTop: 34, gap: 20 },
  row: { flexDirection: "row", gap: 14, alignItems: "flex-start" },
  iconWrap: { width: 40, height: 40, borderRadius: 13, alignItems: "center", justifyContent: "center" },
  pTitle: { color: colors.text, fontSize: 16, fontWeight: "700", marginBottom: 3 },
  pBody: { color: colors.muted, fontSize: 14, lineHeight: 20 },
});
