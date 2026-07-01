import { useState } from "react";
import { NavigationContainer, DefaultTheme, createNavigationContainerRef } from "@react-navigation/native";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { SafeAreaProvider, useSafeAreaInsets } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import Constants from "expo-constants";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import CreateScreen from "./src/screens/CreateScreen";
import DecksScreen from "./src/screens/DecksScreen";
import AccountScreen from "./src/screens/AccountScreen";
import HelpScreen from "./src/screens/HelpScreen";
import { ShareContext } from "./src/shareContext";
import { colors, GRADIENT } from "./src/theme";

const Tab = createBottomTabNavigator();
export const navigationRef = createNavigationContainerRef();

const ICONS = { Create: "sparkles", Decks: "albums", Help: "help-circle", Account: "person" };

// The Share Extension needs native code that Expo Go can't load, so we only pull
// it in for real builds. In Expo Go this stays a passthrough and nothing breaks.
const IS_EXPO_GO = Constants.executionEnvironment === "storeClient";
const ShareWrapper = IS_EXPO_GO
  ? ({ children }) => children
  : require("./src/ShareWrapper").default;

const navTheme = {
  ...DefaultTheme,
  dark: true,
  colors: {
    ...DefaultTheme.colors,
    background: colors.bg,
    card: colors.bg,
    text: colors.text,
    border: colors.line,
    primary: colors.indigo,
    notification: colors.pink,
  },
};

function FloatingTabBar({ state, navigation }) {
  const insets = useSafeAreaInsets();
  return (
    <View style={[styles.tabWrap, { paddingBottom: insets.bottom ? insets.bottom : 14 }]}>
      <View style={styles.tabBar}>
        {state.routes.map((route, index) => {
          const focused = state.index === index;
          const onPress = () => {
            const event = navigation.emit({ type: "tabPress", target: route.key, canPreventDefault: true });
            if (!focused && !event.defaultPrevented) navigation.navigate(route.name);
          };
          return (
            <TouchableOpacity key={route.key} style={styles.tabItem} onPress={onPress} activeOpacity={0.8}>
              {focused ? (
                <LinearGradient colors={GRADIENT} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.pill}>
                  <Ionicons name={ICONS[route.name]} size={22} color="#fff" />
                </LinearGradient>
              ) : (
                <View style={styles.pillGhost}>
                  <Ionicons name={`${ICONS[route.name]}-outline`} size={23} color={colors.faint} />
                </View>
              )}
              <Text style={[styles.label, focused && styles.labelActive]}>{route.name}</Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

export default function App() {
  const [pending, setPending] = useState(null);
  const shareValue = { pending, clear: () => setPending(null) };

  return (
    <ShareContext.Provider value={shareValue}>
      <ShareWrapper setPending={setPending} navigationRef={navigationRef}>
        <SafeAreaProvider>
          <StatusBar style="light" />
          <NavigationContainer ref={navigationRef} theme={navTheme}>
            <Tab.Navigator
              screenOptions={{ headerShown: false }}
              tabBar={(props) => <FloatingTabBar {...props} />}
            >
              <Tab.Screen name="Create" component={CreateScreen} />
              <Tab.Screen name="Decks" component={DecksScreen} />
              <Tab.Screen name="Help" component={HelpScreen} />
              <Tab.Screen name="Account" component={AccountScreen} />
            </Tab.Navigator>
          </NavigationContainer>
        </SafeAreaProvider>
      </ShareWrapper>
    </ShareContext.Provider>
  );
}

const styles = StyleSheet.create({
  tabWrap: { position: "absolute", left: 0, right: 0, bottom: 0, paddingHorizontal: 18 },
  tabBar: {
    flexDirection: "row",
    backgroundColor: "rgba(18,23,41,0.96)",
    borderRadius: 26,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    paddingVertical: 10,
    justifyContent: "space-around",
    shadowColor: colors.glow,
    shadowOpacity: 0.35,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 10 },
    elevation: 14,
  },
  tabItem: { alignItems: "center", flex: 1, gap: 4 },
  pill: {
    width: 42,
    height: 42,
    borderRadius: 15,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: colors.glow,
    shadowOpacity: 0.6,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
  },
  pillGhost: { width: 42, height: 42, borderRadius: 15, alignItems: "center", justifyContent: "center" },
  label: { fontSize: 11, color: colors.faint, fontWeight: "600" },
  labelActive: { color: colors.text },
});
