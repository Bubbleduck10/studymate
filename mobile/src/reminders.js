import * as Notifications from "expo-notifications";
import AsyncStorage from "@react-native-async-storage/async-storage";

const KEY = "remindersOn";

export async function getReminders() {
  return (await AsyncStorage.getItem(KEY)) === "1";
}

// Turn a daily 7pm "review your decks" local notification on/off.
// Returns true on success, false if permission was denied.
export async function setReminders(on) {
  if (on) {
    const { status } = await Notifications.requestPermissionsAsync();
    if (status !== "granted") return false;
    await Notifications.cancelAllScheduledNotificationsAsync();
    await Notifications.scheduleNotificationAsync({
      content: { title: "NoteJet", body: "Time to review your decks 📚" },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DAILY,
        hour: 19,
        minute: 0,
      },
    });
    await AsyncStorage.setItem(KEY, "1");
    return true;
  }
  await Notifications.cancelAllScheduledNotificationsAsync();
  await AsyncStorage.setItem(KEY, "0");
  return true;
}
