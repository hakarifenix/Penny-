import { Capacitor } from "@capacitor/core";
import { Filesystem, Directory, Encoding } from "@capacitor/filesystem";
import { Share } from "@capacitor/share";

/**
 * Save a text file for the user.
 * - On native (Capacitor), writes to the cache directory then opens the OS
 *   share sheet so the user can save/share the file. No storage permission is
 *   required for the app cache directory.
 * - On web, triggers a normal browser download.
 */
export async function saveTextFile(
  filename: string,
  mime: string,
  text: string,
): Promise<void> {
  if (Capacitor.isNativePlatform()) {
    const written = await Filesystem.writeFile({
      path: filename,
      data: text,
      directory: Directory.Cache,
      encoding: Encoding.UTF8,
    });
    const result = await Filesystem.getUri({
      directory: Directory.Cache,
      path: filename,
    });
    await Share.share({
      title: filename,
      url: result.uri,
      dialogTitle: filename,
    }).catch(async () => {
      // If the share sheet is unavailable, at least the file was written.
      void written;
    });
    return;
  }

  // Web fallback: Blob + anchor download.
  const blob = new Blob([text], { type: `${mime};charset=utf-8` });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  // Give the browser a moment before revoking.
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/** Timestamped filename, e.g. pennytrack-backup-2024-05-01.json. */
export function timestampedFilename(prefix: string, extension: string): string {
  const d = new Date();
  const pad = (n: number) => (n < 10 ? `0${n}` : String(n));
  return `${prefix}-${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}.${extension}`;
}
