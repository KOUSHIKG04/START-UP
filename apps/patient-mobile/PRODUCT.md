# Product

<!-- impeccable:product-schema 1 -->

## Platform

adaptive

## Users

Patients using the mobile app to reach healthcare services and manage their care. This is inferred from the patient app boundary and its existing navigation labels.

## Product Purpose

Provide a mobile entry point for finding care, booking appointments, viewing records, managing a profile, and reaching emergency support.

## Operating Context

The app is designed for portrait mobile use. The Home screen prioritizes frequent healthcare actions that can be reached with one tap.

## Capabilities and Constraints

- Expo and React Native application using Expo Router.
- Shared UI components and design tokens come from the monorepo packages.
- The current Home request is UI-only. Search, notifications, location selection, and service actions do not yet have confirmed behavior.
- Medical workflows, data sources, authentication behavior, and clinical claims remain undecided.

## Brand Commitments

Preserve the existing teal patient palette, rounded controls, line-icon vocabulary, and the supplied Home screen reference.

## Evidence on Hand

- User-supplied Home screen reference image.
- Existing patient color, spacing, radius, typography, and gradient tokens.
- Existing shared search, icon-label, navigation, and SOS components.

## Product Principles

- Put frequent patient actions within immediate reach.
- Keep healthcare navigation familiar and easy to scan.
- Reuse shared components so behavior remains consistent across the mobile apps.
- Do not imply medical functionality that has not been implemented.

## Accessibility & Inclusion

Interactive controls must retain accessible names, touch targets, and readable contrast on both light and branded surfaces.
