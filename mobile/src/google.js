import { GoogleSignin } from "@react-native-google-signin/google-signin";

const IOS_CLIENT_ID = "268086658855-gjlhs1f4qb8rmo412stivk41n8o7ena4.apps.googleusercontent.com";
const WEB_CLIENT_ID = "268086658855-ma953bo58e518abhgk49gj797ivvujf9.apps.googleusercontent.com";

let configured = false;
function configure() {
  if (configured) return;
  GoogleSignin.configure({ iosClientId: IOS_CLIENT_ID, webClientId: WEB_CLIENT_ID });
  configured = true;
}

// Opens the native Google sign-in sheet. Returns { idToken } on success,
// null if the user cancels, or throws on error.
export async function googleSignIn() {
  configure();
  await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: false });
  const res = await GoogleSignin.signIn();
  if (res?.type === "cancelled") return null;
  const idToken = res?.data?.idToken || res?.idToken;
  if (!idToken) throw new Error("Couldn't get a Google token.");
  return { idToken };
}
