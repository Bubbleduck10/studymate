import { useState, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  Image,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as ImagePicker from "expo-image-picker";
import { api } from "../api";
import { colors } from "../theme";
import GradientButton from "../components/GradientButton";
import { useShare } from "../shareContext";

export default function CreateScreen() {
  const insets = useSafeAreaInsets();
  const share = useShare();
  const [url, setUrl] = useState("");
  const [text, setText] = useState("");
  const [image, setImage] = useState(null);
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState("");
  const [result, setResult] = useState(null);
  const [revealed, setRevealed] = useState({});

  async function pickImage() {
    const res = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      base64: true,
      quality: 0.7,
    });
    if (!res.canceled && res.assets?.[0]) {
      const a = res.assets[0];
      setImage({ data: a.base64, mediaType: a.mimeType || "image/jpeg", uri: a.uri });
      setStatus("");
    }
  }

  async function runWith(payload) {
    setLoading(true);
    setResult(null);
    setRevealed({});
    setStatus(payload.url ? "Reading the link…" : "Thinking…");
    const { ok, status: s, data } = await api.generate(payload);
    setLoading(false);
    if (s === 402)
      return setStatus(`Not enough credits — needs ${data.creditsNeeded}, you have ${data.creditsRemaining}.`);
    if (!ok) return setStatus(data.error || "Something went wrong.");
    setResult(data);
    setStatus(
      data.creditsUsed ? `Done — used ${data.creditsUsed} credit${data.creditsUsed > 1 ? "s" : ""}.` : "",
    );
  }

  function run() {
    if (text.trim()) return runWith({ text: text.trim() });
    if (url.trim()) return runWith({ url: url.trim() });
    if (image) return runWith({ image: { data: image.data, mediaType: image.mediaType } });
    setStatus("Add a link, some text, or a screenshot.");
  }

  // Auto-run when content is shared into the app (Share → NoteJet).
  useEffect(() => {
    const p = share.pending;
    if (!p) return;
    if (p.url) {
      setUrl(p.url);
      setText("");
      setImage(null);
    } else if (p.text) {
      setText(p.text);
      setUrl("");
      setImage(null);
    } else if (p.image) {
      setImage({
        data: p.image.data,
        mediaType: p.image.mediaType,
        uri: `data:${p.image.mediaType};base64,${p.image.data}`,
      });
      setUrl("");
      setText("");
    }
    share.clear();
    runWith(p.url ? { url: p.url } : p.text ? { text: p.text } : { image: p.image });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [share.pending?.id]);

  async function save() {
    if (!result) return;
    setStatus("Saving…");
    const { ok, data } = await api.saveDeck({
      title: result.title,
      notes: result.notes,
      quiz: result.quiz,
    });
    setStatus(ok ? "Saved to Decks." : data.error || "Save failed.");
  }

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: colors.bg }}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <ScrollView
        contentContainerStyle={[styles.scroll, { paddingTop: insets.top + 14, paddingBottom: 130 }]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.brand}>NOTEJET</Text>
        <Text style={styles.h1}>Make study notes</Text>
        <Text style={styles.sub}>Paste a link, drop in text, or pick a screenshot.</Text>

        <TextInput
          style={styles.input}
          placeholder="YouTube or article link"
          placeholderTextColor={colors.faint}
          value={url}
          onChangeText={setUrl}
          autoCapitalize="none"
          autoCorrect={false}
        />
        <TextInput
          style={[styles.input, styles.textarea]}
          placeholder="…or paste a transcript / notes"
          placeholderTextColor={colors.faint}
          value={text}
          onChangeText={setText}
          multiline
        />
        <TouchableOpacity style={styles.imgBtn} onPress={pickImage} activeOpacity={0.8}>
          <Text style={styles.imgBtnText}>
            {image ? "✓ Screenshot selected — tap to change" : "＋  Pick a screenshot"}
          </Text>
        </TouchableOpacity>
        {image && <Image source={{ uri: image.uri }} style={styles.preview} resizeMode="cover" />}

        <GradientButton title="Generate notes & quiz" onPress={run} loading={loading} style={{ marginTop: 4 }} />
        {!!status && <Text style={styles.status}>{status}</Text>}

        {result && (
          <View style={styles.result}>
            <Text style={styles.title}>{result.title}</Text>
            {result.notes?.map((n, i) => (
              <View key={i} style={styles.noteRow}>
                <View style={styles.dot} />
                <Text style={styles.note}>{n}</Text>
              </View>
            ))}
            <Text style={styles.quizLabel}>QUIZ</Text>
            {result.quiz?.map((q, i) => (
              <View key={i} style={styles.qCard}>
                <Text style={styles.q}>
                  Q{i + 1}. {q.question}
                </Text>
                {revealed[i] ? (
                  <Text style={styles.a}>{q.answer}</Text>
                ) : (
                  <TouchableOpacity onPress={() => setRevealed((r) => ({ ...r, [i]: true }))}>
                    <Text style={styles.reveal}>Show answer</Text>
                  </TouchableOpacity>
                )}
              </View>
            ))}
            <TouchableOpacity style={styles.saveBtn} onPress={save} activeOpacity={0.8}>
              <Text style={styles.saveText}>Save to Decks</Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  scroll: { paddingHorizontal: 18 },
  brand: { color: colors.violet, fontWeight: "800", fontSize: 12, letterSpacing: 3, marginBottom: 6 },
  h1: { fontSize: 30, fontWeight: "800", color: colors.text, letterSpacing: -0.5 },
  sub: { fontSize: 15, color: colors.muted, marginTop: 6, marginBottom: 20 },
  input: {
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    borderRadius: 14,
    padding: 15,
    fontSize: 15,
    color: colors.text,
    marginBottom: 10,
  },
  textarea: { height: 110, textAlignVertical: "top" },
  imgBtn: {
    backgroundColor: colors.card,
    borderWidth: 1,
    borderStyle: "dashed",
    borderColor: colors.cardBorder,
    borderRadius: 14,
    padding: 16,
    alignItems: "center",
    marginBottom: 14,
  },
  imgBtnText: { color: colors.muted, fontWeight: "600" },
  preview: { width: "100%", height: 170, borderRadius: 14, marginBottom: 14 },
  status: { color: colors.muted, fontSize: 14, marginTop: 14, textAlign: "center" },
  result: {
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    borderRadius: 18,
    padding: 18,
    marginTop: 20,
  },
  title: { fontSize: 20, fontWeight: "800", color: colors.text, marginBottom: 14 },
  noteRow: { flexDirection: "row", marginBottom: 10, alignItems: "flex-start" },
  dot: { width: 7, height: 7, borderRadius: 4, backgroundColor: colors.violet, marginTop: 7, marginRight: 12 },
  note: { flex: 1, fontSize: 15, color: colors.text, lineHeight: 22 },
  quizLabel: { color: colors.pink, fontWeight: "800", fontSize: 12, letterSpacing: 1.5, marginTop: 16, marginBottom: 10 },
  qCard: { backgroundColor: colors.bgElev, borderRadius: 14, padding: 14, marginBottom: 10 },
  q: { fontSize: 15, fontWeight: "600", color: colors.text, marginBottom: 8, lineHeight: 21 },
  a: { fontSize: 15, color: colors.success, lineHeight: 21 },
  reveal: { color: colors.violet, fontWeight: "700" },
  saveBtn: {
    marginTop: 8,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: "center",
  },
  saveText: { color: colors.text, fontWeight: "700" },
});
