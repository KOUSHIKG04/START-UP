import { type Href } from "expo-router";
export function getFindDoctorRoute(consultationType: string) {
  return {
    pathname: "/find-doctor",
    params: { consultationType },
  } as unknown as Href;
}
