"use client";

import { getFacilityLocation } from "../services/browserLocation";
import { Button } from "@startup/web-ui/components/ui/button";
import { Input } from "@startup/web-ui/components/ui/input";
import { Label } from "@startup/web-ui/components/ui/label";
import { Spinner } from "@startup/web-ui/components/ui/spinner";
import { FacilityLocationMap } from "./FacilityLocationMap";
import type { FacilityAddressFieldsProps } from "../types/facilityAddressFields";

export function FacilityAddressFields({
  mapsApiKey,
  facilityAddress,
  setFacilityAddress,
  facilityLocality,
  setFacilityLocality,
  facilityCity,
  setFacilityCity,
  facilityState,
  setFacilityState,
  facilityPincode,
  setFacilityPincode,
  facilityLocation,
  mapUnavailable,
  locating,
  locationMessage,
  handleMapUnavailable,
  registering,
  applyLocation,
  useCurrentLocation,
}: FacilityAddressFieldsProps) {
  return (
    <div className="space-y-3">
      {mapsApiKey && !mapUnavailable && (
        <FacilityLocationMap
          apiKey={mapsApiKey}
          selected={facilityLocation}
          getCurrentLocation={getFacilityLocation}
          onConfirm={applyLocation}
          onUnavailable={handleMapUnavailable}
          disabled={registering}
        />
      )}
      <div className="space-y-2">
        <Label htmlFor="facility-address">Street address</Label>
        <Input
          id="facility-address"
          placeholder="Street address"
          value={facilityAddress}
          onChange={(event) => setFacilityAddress(event.target.value)}
          minLength={5}
          maxLength={500}
          required
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="facility-locality">Area / locality</Label>
        <Input
          id="facility-locality"
          placeholder="Area or locality"
          value={facilityLocality}
          onChange={(event) => setFacilityLocality(event.target.value)}
          minLength={2}
          maxLength={120}
          required
        />
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="facility-city">City</Label>
          <Input
            id="facility-city"
            placeholder="City"
            value={facilityCity}
            onChange={(event) => setFacilityCity(event.target.value)}
            minLength={2}
            maxLength={120}
            required
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="facility-state">State</Label>
          <Input
            id="facility-state"
            placeholder="State"
            value={facilityState}
            onChange={(event) => setFacilityState(event.target.value)}
            minLength={2}
            maxLength={120}
            required
          />
        </div>
      </div>
      <div className="space-y-2">
        <Label htmlFor="facility-pincode">Pincode</Label>
        <Input
          id="facility-pincode"
          placeholder="6-digit pincode"
          value={facilityPincode}
          onChange={(event) =>
            setFacilityPincode(
              event.target.value.replace(/\D/g, "").slice(0, 6)
            )
          }
          inputMode="numeric"
          pattern="[0-9]{6}"
          maxLength={6}
          required
        />
      </div>
      {(!mapsApiKey || mapUnavailable) && (
        <Button
          type="button"
          variant="outline"
          onClick={useCurrentLocation}
          disabled={locating || registering}
        >
          {locating ? (
            <Spinner aria-label="Getting location" />
          ) : (
            "Use current location"
          )}
        </Button>
      )}
      {locationMessage && (
        <p role="status" className="text-muted-foreground text-sm">
          {locationMessage}
        </p>
      )}
    </div>
  );
}
