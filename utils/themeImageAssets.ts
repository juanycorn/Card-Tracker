import { Directory, File, Paths } from 'expo-file-system';
import * as ImagePicker from 'expo-image-picker';
import type { ThemeAssetSlot } from '../storage/customThemes';

const THEME_ASSET_DIRECTORY = new Directory(Paths.document, 'theme-assets');

function ensureAssetDirectory() {
  if (!THEME_ASSET_DIRECTORY.exists) {
    THEME_ASSET_DIRECTORY.create();
  }
}

function extensionFor(asset: ImagePicker.ImagePickerAsset): string {
  const fromName = asset.fileName?.split('.').pop()?.toLowerCase();
  if (fromName && /^[a-z0-9]+$/.test(fromName)) return fromName;
  if (asset.mimeType === 'image/png') return 'png';
  if (asset.mimeType === 'image/webp') return 'webp';
  if (asset.mimeType === 'image/gif') return 'gif';
  return 'jpg';
}

export async function pickThemeImage(themeId: string, slot: 'backgroundImage' | 'previewImage'): Promise<ThemeAssetSlot | null> {
  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ['images'],
    allowsEditing: false,
    quality: 1,
  });

  if (result.canceled || !result.assets[0]) return null;

  ensureAssetDirectory();
  const asset = result.assets[0];
  const extension = extensionFor(asset);
  const destination = new File(THEME_ASSET_DIRECTORY, `${themeId}-${slot}-${Date.now()}.${extension}`);
  const source = new File(asset.uri);
  source.copy(destination);

  return {
    uri: destination.uri,
    name: asset.fileName || `${slot}.${extension}`,
    mimeType: asset.mimeType || `image/${extension === 'jpg' ? 'jpeg' : extension}`,
  };
}

export function deleteThemeImage(asset?: ThemeAssetSlot): void {
  if (!asset?.uri || !asset.uri.startsWith(Paths.document.uri)) return;
  try {
    const file = new File(asset.uri);
    if (file.exists) file.delete();
  } catch {
    // Asset metadata can outlive a missing file; removing the slot should still succeed.
  }
}
