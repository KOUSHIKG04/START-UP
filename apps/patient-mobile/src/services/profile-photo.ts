import * as Crypto from "expo-crypto";
import { File } from "expo-file-system";
import { setMyProfilePhoto } from "@startup/data-access";
import { supabase } from "./supabase";

export async function uploadPatientProfilePhoto(photo?: { uri: string; mimeType: string }) {
  if (!photo) return;
  if (!supabase) throw new Error("Supabase is not configured.");
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) throw error ?? new Error("Sign in to upload a photo.");
  const path = `${data.user.id}/${Crypto.randomUUID()}.${photo.mimeType === "image/png" ? "png" : "jpg"}`;
  const bytes = await new File(photo.uri).arrayBuffer();
  const upload = await supabase.storage.from("patient-profile-photos").upload(path, bytes, { contentType: photo.mimeType, upsert: false });
  if (upload.error) throw upload.error;
  return path;
}

export async function savePatientProfilePhoto(photo?: { uri: string; mimeType: string }) {
  const path = await uploadPatientProfilePhoto(photo);
  if (path && supabase) await setMyProfilePhoto(supabase, "patient", path);
}
