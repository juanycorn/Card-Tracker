import { Directory, File, Paths } from 'expo-file-system';
import * as DocumentPicker from 'expo-document-picker';
import type { ThemeAssetSlot } from '../storage/customThemes';

const THEME_AUDIO_DIRECTORY = new Directory(Paths.document, 'theme-audio');

function ensureAudioDirectory() {
  if (!THEME_AUDIO_DIRECTORY.exists) THEME_AUDIO_DIRECTORY.create();
}

function safeExtension(name?: string, mimeType?: string): string {
  const ext = name?.split('.').pop()?.toLowerCase();
  if (ext && /^[a-z0-9]{2,5}$/.test(ext)) return ext;
  if (mimeType?.includes('wav')) return 'wav';
  if (mimeType?.includes('mp4') || mimeType?.includes('m4a')) return 'm4a';
  if (mimeType?.includes('ogg')) return 'ogg';
  return 'mp3';
}

export async function pickThemeAudio(themeId: string, slot: string): Promise<ThemeAssetSlot | null> {
  const result = await DocumentPicker.getDocumentAsync({
    type: 'audio/*',
    copyToCacheDirectory: true,
    multiple: false,
  });
  if (result.canceled || !result.assets[0]) return null;

  ensureAudioDirectory();
  const asset = result.assets[0];
  const extension = safeExtension(asset.name, asset.mimeType);
  const destination = new File(THEME_AUDIO_DIRECTORY, `${themeId}-${slot}-${Date.now()}.${extension}`);
  new File(asset.uri).copy(destination);

  return {
    uri: destination.uri,
    name: asset.name || `${slot}.${extension}`,
    mimeType: asset.mimeType || `audio/${extension}`,
  };
}

export function deleteThemeAudio(asset?: ThemeAssetSlot): void {
  if (!asset?.uri || !asset.uri.startsWith(Paths.document.uri)) return;
  try {
    const file = new File(asset.uri);
    if (file.exists) file.delete();
  } catch {
    // A saved theme may outlive a manually removed file.
  }
}
