import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  getMyDoctorProfile,
  updateMyDoctorProfile,
} from "@startup/data-access";
import { useToast, useToastFeedback } from "@startup/mobile-ui";
import { supabase } from "../../../services/supabase";
export function useLiveDoctorProfile() {
  const client = useQueryClient();
  const { showToast } = useToast();
  const profile = useQuery({
    queryKey: ["my-doctor-profile"],
    queryFn: () => getMyDoctorProfile(supabase!),
    enabled: !!supabase,
  });
  const [name, setName] = useState("");
  const [bio, setBio] = useState("");
  const [languages, setLanguages] = useState("");
  useToastFeedback({ error: profile.error?.message });
  const [editing, setEditing] = useState(false);
  useEffect(() => {
    if (!profile.data) return;
    setName(profile.data.full_name);
    setBio(profile.data.bio ?? "");
    setLanguages(profile.data.languages.join(", "));
  }, [profile.data]);
  const save = useMutation({
    mutationFn: () =>
      updateMyDoctorProfile(supabase!, {
        fullName: name,
        bio,
        languages: languages
          .split(",")
          .map((item) => item.trim().toLowerCase())
          .filter(Boolean),
      }),
    onSuccess: async () => {
      showToast({ title: "Profile saved", type: "success" });
      setEditing(false);
      await client.invalidateQueries({ queryKey: ["my-doctor-profile"] });
    },
    onError: (error) => {
      showToast({
        title: "Could not save profile",
        message: error.message,
        type: "error",
      });
    },
  });

  return {
    profile,
    name,
    setName,
    bio,
    setBio,
    languages,
    setLanguages,
    editing,
    setEditing,
    save,
  };
}
