import { useState, useCallback } from "react";
import { useFocusEffect } from "@react-navigation/native";
import { View, Text, TextInput, ScrollView, TouchableOpacity, StyleSheet, ActivityIndicator, Switch } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { api } from "../api";
import { colors, GRADIENT } from "../theme";
import GradientButton from "../components/GradientButton";
import { googleSignIn } from "../google";
import { getReminders, setReminders } from "../reminders";

export default function AccountScreen() {
  const insets = useSafeAreaInsets();
  const [step, setStep] = useState("loading"); // loading | out | sent | username | in
  const [account, setAccount] = useState(null);
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [username, setUsername] = useState("");
  const [remindersOn, setRemindersOn] = useState(false);
  const [status, setStatus] = useState("");

  const refresh = useCallback(async () => {
    const { ok, data } = await api.me();
    if (ok && data.signedIn) {
      setAccount(data);
      setStep("in");
    } else {
      setAccount(null);
      setStep((s) => (s === "loading" || s === "in" ? "out" : s));
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      refresh();
      getReminders().then(setRemindersOn);
    }, [refresh]),
  );

  async function google() {
    try {
      setStatus("Opening Google…");
      const r = await googleSignIn();
      if (!r) return setStatus("");
      const { ok, data } = await api.googleAuth(r.idToken);
      if (!ok) return setStatus(data.error || "Google sign-in failed.");
      await api.setToken(data.token);
      setStatus("");
      if (data.needsUsername) setStep("username");
      else refresh();
    } catch (e) {
      setStatus(e?.message || "Google sign-in failed.");
    }
  }

  async function toggleReminders(v) {
    const ok = await setReminders(v);
    if (!ok) return setStatus("Enable notifications in Settings to get reminders.");
    setRemindersOn(v);
  }

  async function sendCode() {
    if (!email.trim()) return setStatus("Enter your email.");
    setStatus("Sending code…");
    const { ok, data } = await api.requestCode(email.trim());
    if (ok) {
      setStep("sent");
      setStatus("We emailed you a 6-digit code.");
    } else setStatus(data.error || "Could not send code.");
  }

  async function verify() {
    setStatus("Verifying…");
    const { ok, data } = await api.verifyCode(email.trim(), code.trim());
    if (!ok) return setStatus(data.error || "Verification failed.");
    await api.setToken(data.token);
    if (data.needsUsername) {
      setStatus("");
      setStep("username");
    } else {
      setStatus("");
      refresh();
    }
  }

  async function saveUsername() {
    if (!username.trim()) return setStatus("Pick a username.");
    setStatus("Saving…");
    const { ok, data } = await api.setUsername(username.trim());
    if (ok) {
      setStatus("");
      refresh();
    } else setStatus(data.error || "Could not set username.");
  }

  async function signOut() {
    await api.signOut();
    setEmail("");
    setCode("");
    setUsername("");
    setStatus("");
    setStep("out");
    setAccount(null);
  }

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.bg }}
      contentContainerStyle={[styles.scroll, { paddingTop: insets.top + 14, paddingBottom: 130 }]}
      keyboardShouldPersistTaps="handled"
      showsVerticalScrollIndicator={false}
    >
      <Text style={styles.brand}>NOTEJET</Text>

      {step === "loading" && <ActivityIndicator color={colors.violet} style={{ marginTop: 40 }} />}

      {step === "in" && account && (
        <View>
          <LinearGradient colors={GRADIENT} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.avatar}>
            <Text style={styles.avatarText}>
              {(account.username || account.email || "?").slice(0, 2).toUpperCase()}
            </Text>
          </LinearGradient>
          <Text style={styles.name}>{account.username || account.email}</Text>
          {account.username ? <Text style={styles.emailSub}>{account.email}</Text> : null}
          <View style={styles.statRow}>
            <View style={[styles.pill, account.tier === "pro" && styles.pillPro]}>
              <Text style={[styles.pillText, account.tier === "pro" && styles.pillProText]}>
                {account.tier === "pro" ? "PRO" : "FREE"}
              </Text>
            </View>
            <Text style={styles.credits}>{account.creditsRemaining} credits</Text>
          </View>
          {account.tier !== "pro" && (
            <Text style={styles.hint}>Manage your plan and get more credits at notejet.app.</Text>
          )}
          <View style={styles.toggleRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.toggleTitle}>Study reminders</Text>
              <Text style={styles.toggleSub}>A daily nudge to review your decks.</Text>
            </View>
            <Switch
              value={remindersOn}
              onValueChange={toggleReminders}
              trackColor={{ false: colors.bgElev, true: colors.indigo }}
              thumbColor="#fff"
            />
          </View>
          <TouchableOpacity style={styles.outBtn} onPress={signOut} activeOpacity={0.8}>
            <Text style={styles.outText}>Sign out</Text>
          </TouchableOpacity>
        </View>
      )}

      {(step === "out" || step === "sent") && (
        <View>
          <Text style={styles.h1}>Sign in</Text>
          <Text style={styles.sub}>Continue with Google, or get a one-time email code.</Text>
          {step === "out" && (
            <>
              <TouchableOpacity style={styles.googleBtn} onPress={google} activeOpacity={0.85}>
                <Ionicons name="logo-google" size={18} color={colors.text} />
                <Text style={styles.googleText}>Continue with Google</Text>
              </TouchableOpacity>
              <View style={styles.divider}>
                <View style={styles.line} />
                <Text style={styles.or}>or</Text>
                <View style={styles.line} />
              </View>
            </>
          )}
          <TextInput
            style={styles.input}
            placeholder="you@email.com"
            placeholderTextColor={colors.faint}
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            autoCorrect={false}
            keyboardType="email-address"
          />
          {step === "sent" && (
            <TextInput
              style={styles.input}
              placeholder="6-digit code"
              placeholderTextColor={colors.faint}
              value={code}
              onChangeText={setCode}
              keyboardType="number-pad"
              maxLength={6}
            />
          )}
          <GradientButton
            title={step === "sent" ? "Verify & sign in" : "Email me a code"}
            onPress={step === "sent" ? verify : sendCode}
          />
          <Text style={styles.hint}>
            New here? You'll pick a username next. Buy Pro on notejet.app and it carries over.
          </Text>
        </View>
      )}

      {step === "username" && (
        <View>
          <Text style={styles.h1}>Choose a username</Text>
          <Text style={styles.sub}>This is your display name across NoteJet.</Text>
          <TextInput
            style={styles.input}
            placeholder="username"
            placeholderTextColor={colors.faint}
            value={username}
            onChangeText={setUsername}
            autoCapitalize="none"
            autoCorrect={false}
            maxLength={20}
          />
          <Text style={styles.fine}>3–20 characters · letters, numbers, underscore</Text>
          <GradientButton title="Finish" onPress={saveUsername} />
        </View>
      )}

      {!!status && <Text style={styles.status}>{status}</Text>}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: { paddingHorizontal: 18 },
  brand: { color: colors.violet, fontWeight: "800", fontSize: 12, letterSpacing: 3, marginBottom: 16 },
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
    marginBottom: 12,
  },
  hint: { color: colors.muted, fontSize: 13, marginTop: 16, lineHeight: 19 },
  fine: { color: colors.faint, fontSize: 12, marginBottom: 12 },
  status: { color: colors.muted, fontSize: 14, marginTop: 16, textAlign: "center" },
  avatar: {
    width: 78,
    height: 78,
    borderRadius: 24,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 14,
    shadowColor: colors.glow,
    shadowOpacity: 0.5,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 6 },
  },
  avatarText: { color: "#fff", fontWeight: "800", fontSize: 28 },
  name: { fontSize: 24, fontWeight: "800", color: colors.text },
  emailSub: { color: colors.muted, fontSize: 14, marginTop: 3 },
  statRow: { flexDirection: "row", alignItems: "center", marginTop: 14, gap: 10 },
  pill: { backgroundColor: colors.bgElev, borderWidth: 1, borderColor: colors.cardBorder, borderRadius: 999, paddingHorizontal: 12, paddingVertical: 5 },
  pillPro: { backgroundColor: colors.indigo, borderColor: colors.indigo },
  pillText: { color: colors.muted, fontWeight: "800", fontSize: 12, letterSpacing: 1 },
  pillProText: { color: "#fff" },
  credits: { color: colors.text, fontWeight: "700", fontSize: 15 },
  outBtn: { marginTop: 26, borderWidth: 1, borderColor: colors.cardBorder, borderRadius: 14, paddingVertical: 14, alignItems: "center" },
  outText: { color: colors.danger, fontWeight: "700" },
  googleBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    borderRadius: 14,
    paddingVertical: 15,
    marginBottom: 16,
  },
  googleText: { color: colors.text, fontWeight: "700", fontSize: 15 },
  divider: { flexDirection: "row", alignItems: "center", marginBottom: 16 },
  line: { flex: 1, height: 1, backgroundColor: colors.cardBorder },
  or: { color: colors.faint, fontSize: 13, paddingHorizontal: 12 },
  toggleRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 24,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    borderRadius: 14,
    padding: 16,
  },
  toggleTitle: { color: colors.text, fontWeight: "700", fontSize: 15 },
  toggleSub: { color: colors.muted, fontSize: 13, marginTop: 2 },
});
