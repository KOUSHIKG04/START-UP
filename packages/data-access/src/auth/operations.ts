import {
  onboardingSchema,
  myProfileSchema,
  phoneSchema,
  otpSchema,
} from "@startup/contracts";
import type { OnboardingInput } from "@startup/contracts";
import type { AppSupabaseClient } from "../client/createSupabaseClient";

export async function sendPhoneOtp(client: AppSupabaseClient, phone: string) {
  const parsed = phoneSchema.parse(phone);
  const { error } = await client.auth.signInWithOtp({
    phone: parsed,
    options: { shouldCreateUser: true },
  });
  if (error) throw error;
}

export async function verifyPhoneOtp(client: AppSupabaseClient, phone: string, token: string) {
  const { data, error } = await client.auth.verifyOtp({
    phone: phoneSchema.parse(phone),
    token: otpSchema.parse(token),
    type: "sms",
  });
  if (error) throw error;
  if (!data.session) throw new Error("Verification did not produce a session");
  return data.session;
}

export async function signInWithDevPassword(client: AppSupabaseClient, email: string, password: string) {
  const { data, error } = await client.auth.signInWithPassword({
    email: email.trim(),
    password,
  });
  if (error) throw error;
  if (!data.session) throw new Error("Sign-in did not produce a session");
  return data.session;
}

export async function getMyProfile(client: AppSupabaseClient) {
  const { data, error } = await client.rpc("get_my_profile");
  if (error) throw error;
  return data === null ? null : myProfileSchema.parse(data);
}

export async function completeOnboarding(client: AppSupabaseClient, input: OnboardingInput) {
  const request = onboardingSchema.parse(input);
  const { data, error } = await client.rpc("complete_onboarding", {
    p_kind: request.kind,
    p_details: request.details,
  });
  if (error) throw error;
  return myProfileSchema.parse(data);
}

export async function createDriverInvitation(client: AppSupabaseClient, organizationId: string, phone: string) {
  const { data, error } = await client.rpc("create_driver_invitation", {
    p_organization_id: organizationId,
    p_phone: phoneSchema.parse(phone),
  });
  if (error) throw error;
  return data;
}
