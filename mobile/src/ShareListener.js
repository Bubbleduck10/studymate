import { useEffect } from "react";
import { useShareIntent } from "expo-share-intent";
import * as FileSystem from "expo-file-system";

// Watches for content shared into NoteJet (Share → NoteJet). Turns it into a
// pending payload and jumps to the Create tab. Only mounted in a real build
// (never in Expo Go — see App.js guard).
export default function ShareListener({ setPending, navigationRef }) {
  const { hasShareIntent, shareIntent, resetShareIntent } = useShareIntent();

  useEffect(() => {
    if (!hasShareIntent) return;

    (async () => {
      let payload = null;

      // Shared image / screenshot → read it into base64 for /generate.
      const file = shareIntent?.files?.find((f) => (f.mimeType || "").startsWith("image/"));
      if (file?.path) {
        try {
          const uri = file.path.startsWith("file://") ? file.path : `file://${file.path}`;
          const data = await FileSystem.readAsStringAsync(uri, { encoding: "base64" });
          payload = { image: { data, mediaType: file.mimeType || "image/jpeg" } };
        } catch (e) {
          // fall through to link/text handling below
        }
      }

      // Shared link or text.
      if (!payload && shareIntent?.webUrl) {
        payload = { url: shareIntent.webUrl };
      } else if (!payload && shareIntent?.text) {
        const t = String(shareIntent.text).trim();
        payload = /^https?:\/\//i.test(t) ? { url: t } : { text: t };
      }

      if (payload) {
        setPending({ ...payload, id: Date.now() });
        if (navigationRef?.isReady?.()) navigationRef.navigate("Create");
      }
      resetShareIntent();
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hasShareIntent]);

  return null;
}
