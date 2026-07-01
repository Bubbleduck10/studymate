import { View, Text, ScrollView, StyleSheet } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { colors, GRADIENT } from "../theme";

const STEPS = [
  {
    icon: "sparkles",
    title: "Make study notes",
    body: "On the Create tab, paste a YouTube or article link, drop in a transcript or notes, or pick a screenshot. NoteJet turns it into concise notes plus a short quiz.",
  },
  {
    icon: "share-social",
    title: "Share into NoteJet",
    body: "From any app — Safari, YouTube, Photos — tap Share, then choose NoteJet. It opens straight to Create and generates automatically from the link, text, or screenshot you shared.",
  },
  {
    icon: "albums",
    title: "Save & study",
    body: "Tap “Save to Decks” to keep a set. Open a deck anytime, read the notes, and tap “Show answer” on each quiz question to test yourself.",
  },
  {
    icon: "flash",
    title: "How credits work",
    body: "Each generation costs 1–3 credits depending on how long the material is. You get free credits every month. Manage Pro and buy more credits at notejet.app.",
  },
  {
    icon: "sync",
    title: "Synced everywhere",
    body: "Sign in with the same account here and on notejet.app — your credits and saved decks stay in sync across the web app and your phone.",
  },
];

export default function HelpScreen() {
  const insets = useSafeAreaInsets();
  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.bg }}
      contentContainerStyle={[styles.scroll, { paddingTop: insets.top + 14, paddingBottom: 130 }]}
      showsVerticalScrollIndicator={false}
    >
      <Text style={styles.brand}>NOTEJET</Text>
      <Text style={styles.h1}>How it works</Text>
      <Text style={styles.sub}>Everything you can do with NoteJet.</Text>

      {STEPS.map((s, i) => (
        <View key={i} style={styles.card}>
          <LinearGradient
            colors={GRADIENT}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.iconWrap}
          >
            <Ionicons name={s.icon} size={20} color="#fff" />
          </LinearGradient>
          <View style={{ flex: 1 }}>
            <Text style={styles.cardTitle}>{s.title}</Text>
            <Text style={styles.cardBody}>{s.body}</Text>
          </View>
        </View>
      ))}

      <Text style={styles.footer}>Questions? support@notejet.app</Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: { paddingHorizontal: 18 },
  brand: { color: colors.violet, fontWeight: "800", fontSize: 12, letterSpacing: 3, marginBottom: 6 },
  h1: { fontSize: 30, fontWeight: "800", color: colors.text, letterSpacing: -0.5 },
  sub: { fontSize: 15, color: colors.muted, marginTop: 6, marginBottom: 20 },
  card: {
    flexDirection: "row",
    gap: 14,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
  },
  iconWrap: {
    width: 40,
    height: 40,
    borderRadius: 13,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: colors.glow,
    shadowOpacity: 0.5,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
  },
  cardTitle: { fontSize: 16, fontWeight: "800", color: colors.text, marginBottom: 5 },
  cardBody: { fontSize: 14, color: colors.muted, lineHeight: 21 },
  footer: { color: colors.faint, fontSize: 13, textAlign: "center", marginTop: 8 },
});
