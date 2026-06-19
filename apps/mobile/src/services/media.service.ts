// Install: npx expo install expo-image-picker expo-image-manipulator
import * as ImageManipulator from "expo-image-manipulator";
import * as ImagePicker from "expo-image-picker";
import { apiRequest } from "./api";

export type MediaPurpose = "animal_photo" | "evidence" | "bill" | "prescription" | "medical" | "profile";

export interface UploadedMedia {
  id: string; cdnUrl: string; mimeType: string; purpose: MediaPurpose; originalName: string;
}

const QUALITY: Record<MediaPurpose, { maxWidth: number; quality: number }> = {
  animal_photo: { maxWidth: 1200, quality: 0.82 },
  evidence:     { maxWidth: 1600, quality: 0.88 },
  bill:         { maxWidth: 1600, quality: 0.92 },
  prescription: { maxWidth: 1600, quality: 0.92 },
  medical:      { maxWidth: 1200, quality: 0.85 },
  profile:      { maxWidth: 400,  quality: 0.80 },
};

class MobileMediaService {
// FIX: Make token optional for guest emergency reports
async pickAndUpload(token: string | undefined, opts: {
     purpose: MediaPurpose; source?: "camera" | "gallery";
     linkedCaseId?: string | null; linkedAnimalId?: string | null;
   }): Promise<UploadedMedia | null> {
    const asset = await this.pick(opts.source ?? "gallery");
    if (!asset) return null;

    const compressed = await this.compress(asset.uri, opts.purpose);

    const presign = await apiRequest<{ presignedUrl: string; key: string; cdnUrl: string }>("/media/presign", {
      method: "POST", token,
      body: {
        originalName: asset.fileName ?? `photo-${Date.now()}.jpg`,
        mimeType: asset.mimeType ?? "image/jpeg",
        sizeBytes: asset.fileSize ?? 100000,
        purpose: opts.purpose,
        linkedCaseId: opts.linkedCaseId ?? null,
        linkedAnimalId: opts.linkedAnimalId ?? null,
      },
    });

    await this.uploadToR2(presign.presignedUrl, compressed.uri, asset.mimeType ?? "image/jpeg");

    const confirmed = await apiRequest<UploadedMedia>("/media/confirm", {
      method: "POST", token,
      body: {
        key: presign.key, cdnUrl: presign.cdnUrl,
        originalName: asset.fileName ?? "photo.jpg",
        mimeType: asset.mimeType ?? "image/jpeg",
        sizeBytes: asset.fileSize ?? 0,
        purpose: opts.purpose,
        linkedCaseId: opts.linkedCaseId ?? null,
        linkedAnimalId: opts.linkedAnimalId ?? null,
      },
    });

    return confirmed;
  }

  private async pick(source: "camera" | "gallery") {
    if (source === "camera") {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== "granted") throw new Error("Camera permission denied");
      const r = await ImagePicker.launchCameraAsync({ quality: 1 });
      return r.canceled ? null : r.assets[0];
    }
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== "granted") throw new Error("Photo library permission denied");
    const r = await ImagePicker.launchImageLibraryAsync({ quality: 1 });
    return r.canceled ? null : r.assets[0];
  }

  private async compress(uri: string, purpose: MediaPurpose) {
    const { maxWidth, quality } = QUALITY[purpose];
    return ImageManipulator.manipulateAsync(
      uri,
      [{ resize: { width: maxWidth } }],
      { compress: quality, format: ImageManipulator.SaveFormat.JPEG }
    );
  }

  private async uploadToR2(presignedUrl: string, localUri: string, mimeType: string) {
    if (presignedUrl.includes("dev-mock-upload")) return; // skip in dev
    const blob = await fetch(localUri).then(r => r.blob());
    const res = await fetch(presignedUrl, { method: "PUT", headers: { "Content-Type": mimeType }, body: blob });
    if (!res.ok) throw new Error(`Upload failed: ${res.status}`);
  }
}

export const mobileMediaService = new MobileMediaService();
