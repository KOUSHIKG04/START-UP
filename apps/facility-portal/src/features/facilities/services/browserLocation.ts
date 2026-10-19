"use client";
import type { FacilityLocation } from "../types/facilityVerificationForm";
export function getFacilityLocation(): Promise<FacilityLocation> {
  if (!navigator.geolocation)
    return Promise.reject(
      new Error(
        "Location is unavailable in this browser. Use a supported browser at the facility."
      )
    );
  return new Promise((resolve, reject) =>
    navigator.geolocation.getCurrentPosition(
      (position) => {
        if (position.coords.accuracy > 100) {
          reject(
            new Error(
              `Browser location is only accurate to about ${Math.round(position.coords.accuracy)} m. Turn on precise location or use a device at the facility, then try again.`
            )
          );
          return;
        }
        resolve({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
        });
      },
      () =>
        reject(
          new Error(
            "Allow location access while at the facility, then try again."
          )
        ),
      { enableHighAccuracy: true, maximumAge: 0, timeout: 15000 }
    )
  );
}
