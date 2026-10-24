"use client";

import { FacilityAddressFields } from "./FacilityAddressFields";

import { useFacilityVerification } from "../hooks/useFacilityVerification";

import type { FacilityVerificationFormProps } from "../types/facilityVerificationForm";

import { Button } from "@startup/web-ui/components/ui/button";
import { Input } from "@startup/web-ui/components/ui/input";
import { Label } from "@startup/web-ui/components/ui/label";
import { Skeleton } from "@startup/web-ui/components/ui/skeleton";

export function FacilityVerificationForm({
  facilities,
}: FacilityVerificationFormProps) {
  const {
    mapsApiKey,
    facilityName,
    setFacilityName,
    facilityKind,
    setFacilityKind,
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
    offersBeds,
    setOffersBeds,
    bedTypeCodes,
    setBedTypeCodes,
    bedTypes,
    bedTypesError,
    registering,
    setFacilityId,
    activeFacilityId,
    registration,
    setRegistration,
    certificateRef,
    licenceRef,
    logoRef,
    status,
    setStatus,
    statusLoading,
    setStatusLoading,
    busy,
    checkStatus,
    submit,
    register,
    applyLocation,
    useCurrentLocation,
    awaitingReview,
  } = useFacilityVerification({ facilities });
  const addressFields = (
    <FacilityAddressFields
      mapsApiKey={mapsApiKey}
      facilityAddress={facilityAddress}
      setFacilityAddress={setFacilityAddress}
      facilityLocality={facilityLocality}
      setFacilityLocality={setFacilityLocality}
      facilityCity={facilityCity}
      setFacilityCity={setFacilityCity}
      facilityState={facilityState}
      setFacilityState={setFacilityState}
      facilityPincode={facilityPincode}
      setFacilityPincode={setFacilityPincode}
      facilityLocation={facilityLocation}
      mapUnavailable={mapUnavailable}
      locating={locating}
      locationMessage={locationMessage}
      handleMapUnavailable={handleMapUnavailable}
      registering={registering}
      applyLocation={applyLocation}
      useCurrentLocation={useCurrentLocation}
    />
  );

  return (
    <div className="space-y-5">
      {!facilities.length ? (
        <form
          onSubmit={register}
          className="bg-card space-y-5 rounded-xl border p-6"
        >
          <h2 className="font-semibold">Register your hospital or clinic</h2>
          <p className="text-muted-foreground text-sm">
            Be at the facility to capture its location. Registration remains
            pending until Clinzo approves its documents.
          </p>
          <div className="space-y-2">
            <Label htmlFor="facility-name">Facility name</Label>
            <Input
              id="facility-name"
              value={facilityName}
              onChange={(event) => setFacilityName(event.target.value)}
              minLength={2}
              maxLength={160}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="facility-kind">Type</Label>
            <select
              id="facility-kind"
              value={facilityKind}
              onChange={(event) =>
                setFacilityKind(event.target.value as "hospital" | "clinic")
              }
              className="bg-background h-10 w-full rounded-md border px-3 text-sm"
            >
              <option value="hospital">Hospital</option>
              <option value="clinic">Clinic</option>
            </select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="facility-logo">
              Facility logo or photo (optional)
            </Label>
            <Input
              id="facility-logo"
              type="file"
              accept="image/jpeg,image/png"
              onChange={(event) => {
                logoRef.current = event.target.files?.[0] ?? null;
              }}
            />
            <p className="text-muted-foreground text-xs">
              JPG or PNG, up to 5 MB.
            </p>
          </div>
          {addressFields}
          <fieldset className="space-y-2">
            <legend className="text-sm font-medium">
              Does this facility offer patient beds?
            </legend>
            <div className="flex gap-5 text-sm">
              <label className="flex items-center gap-2">
                <input
                  type="radio"
                  name="offers-beds"
                  checked={offersBeds === true}
                  onChange={() => setOffersBeds(true)}
                  required
                />
                Yes
              </label>
              <label className="flex items-center gap-2">
                <input
                  type="radio"
                  name="offers-beds"
                  checked={offersBeds === false}
                  onChange={() => {
                    setOffersBeds(false);
                    setBedTypeCodes([]);
                  }}
                  required
                />
                No
              </label>
            </div>
          </fieldset>
          {offersBeds && (
            <fieldset className="space-y-2">
              <legend className="text-sm font-medium">
                Bed categories offered
              </legend>
              <p className="text-muted-foreground text-xs">
                Select only categories this facility provides. Enter live bed
                counts after registration.
              </p>
              <div className="grid gap-2 sm:grid-cols-2">
                {bedTypes.map((type) => (
                  <label
                    key={type.code}
                    className="flex items-center gap-2 text-sm"
                  >
                    <input
                      type="checkbox"
                      checked={bedTypeCodes.includes(type.code)}
                      onChange={(event) =>
                        setBedTypeCodes((current) =>
                          event.target.checked
                            ? [...current, type.code]
                            : current.filter((code) => code !== type.code)
                        )
                      }
                    />
                    {type.name}
                  </label>
                ))}
              </div>
            </fieldset>
          )}
          <Button disabled={registering || locating || Boolean(bedTypesError)}>
            {registering ? "Registering…" : "Register facility"}
          </Button>
        </form>
      ) : statusLoading ? (
        <div
          role="status"
          aria-label="Loading verification status"
          className="bg-card space-y-3 rounded-xl border p-6"
        >
          <Skeleton className="h-5 w-48" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-9 w-28" />
        </div>
      ) : awaitingReview ? (
        <section className="bg-card rounded-xl border p-6">
          <h2 className="font-semibold">Awaiting company approval</h2>
          <p className="text-muted-foreground mt-2 text-sm">
            Your registration certificate and operating licence have been
            submitted. The dashboard opens after Clinzo approves the facility.
          </p>
          <Button className="mt-4" variant="outline" onClick={checkStatus}>
            Check status
          </Button>
        </section>
      ) : (
        <form
          onSubmit={submit}
          className="bg-card space-y-5 rounded-xl border p-6"
        >
          <div className="space-y-2">
            <Label htmlFor="facility">Facility</Label>
            <select
              id="facility"
              value={activeFacilityId}
              onChange={(event) => {
                setFacilityId(event.target.value);
                setStatus(null);
                setStatusLoading(true);
              }}
              className="bg-background h-10 w-full rounded-md border px-3 text-sm"
            >
              {facilities.map((facility) => (
                <option key={facility.facility_id} value={facility.facility_id}>
                  {facility.facility_name}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="registration">Registration number</Label>
            <Input
              id="registration"
              value={registration}
              onChange={(event) => setRegistration(event.target.value)}
              minLength={4}
              maxLength={120}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="certificate">Registration certificate</Label>
            <Input
              id="certificate"
              type="file"
              accept="application/pdf,image/jpeg,image/png"
              onChange={(event) => {
                certificateRef.current = event.target.files?.[0] ?? null;
              }}
              required
            />
            <p className="text-muted-foreground text-xs">
              PDF, JPG or PNG, up to 10 MB.
            </p>
          </div>
          <div className="space-y-2">
            <Label htmlFor="licence">Operating licence</Label>
            <Input
              id="licence"
              type="file"
              accept="application/pdf,image/jpeg,image/png"
              onChange={(event) => {
                licenceRef.current = event.target.files?.[0] ?? null;
              }}
              required
            />
          </div>
          <Button disabled={busy}>
            {busy ? "Uploading…" : "Submit for verification"}
          </Button>
        </form>
      )}
      {status && (
        <section className="bg-card rounded-xl border p-6">
          <h2 className="font-semibold">
            Review status: {status.status.replaceAll("_", " ")}
          </h2>
          <ul className="mt-3 space-y-2 text-sm">
            {status.documents.map((document) => (
              <li key={document.kind}>
                <strong className="capitalize">
                  {document.kind.replaceAll("_", " ")}
                </strong>{" "}
                — {document.status}
                {document.rejection_reason && (
                  <p className="text-destructive">
                    {document.rejection_reason}
                  </p>
                )}
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
