---
name: Clinzo Patient Profile
description: Profile overview within the existing Clinzo mobile theme
colors:
  primary-dark: "#087F78"
  surface: "#E6F5F4"
  surface-border: "#C8E8E7"
  text: "#0C2434"
  text-secondary: "#374151"
  background: "#FFFFFF"
  border: "#E0E5EB"
typography:
  title:
    fontFamily: Albert Sans
    fontSize: 18px
    fontWeight: 600
    lineHeight: 24px
  section:
    fontFamily: Albert Sans
    fontSize: 19px
    fontWeight: 600
    lineHeight: 25px
  body:
    fontFamily: Albert Sans
    fontSize: 15px
    fontWeight: 500
    lineHeight: 22px
rounded:
  card: 16px
spacing:
  page-horizontal: 20px
  section-gap: 28px
---

## Overview

This document describes only the redesigned Patient Profile overview. Shared design tokens remain authoritative. It does not authorize changes to other screens or the app's visual identity.

## Colors

Use the existing patient theme for accents, icons, readable text, and white surfaces. Use white option cards with a subtle 1px border, without elevation or shadows.

## Typography

Use the locally loaded Albert Sans weights through shared font-family tokens. Names and section headings establish hierarchy; secondary labels remain smaller than their saved values.

## Layout

Current top layout: show a Profile title inside the gradient header, using the shared Header with a transparent background inside the existing gradient. Use the existing patient gradient across the top safe area and the full photo/name/gender/Age/Blood Group summary; retain a back control when provided. Use white name text for contrast. Settings opens from a white circular icon in the top-right header. Personal Details and all subsequent cards remain on the white scrolling body below the gradient.

Use the patient gradient identity area with top safe-area handling and its existing back action. Give the gradient 16px bottom corners and 24px top / 32px bottom summary padding. Preserve bottom navigation. The scrolling body has a centered maximum width of 560px. Below the header, place the photo on the left and the name with saved gender on the right, with separate Age and Blood Group cards below the name. Give the name row 1.5px left margin and the photo elevation 3 with an iOS shadow equivalent. Do not show a Bookings statistic in this identity area. Keep Personal Details accordion with Edit inside its expanded body, then the family card with Add inside. Omit the Family Members and Quick Access headings. Render My Bookings, Notifications, Transactions as separate stacked cards; Settings is a header action. Transactions currently reports its unavailability through a toast because no payment-history screen/API exists. Long names and addresses wrap. Personal Details starts expanded and can be collapsed and uses the shared Accordion primitive.

## Elevation & Depth

Family and option cards use the original subtle 1px border, with elevation 0 and no shadows.

## Shapes

Use a circular 88px profile image, a 20px gap before the right-hand identity column, 18px name text, 12px health-card corners, and 16px grouped-card corners. Email remains within Personal Details. Buttons retain a minimum 44px touch target. Use a faint neutral pressed fill (`#0C243408`) for Profile action rows. Do not copy the references' unrelated actions, decorative badges, blue/purple palette, or invented verification claims.

## Components

Keep the name and teal gender badge in one vertically centered row without flex wrapping the badge above the name. Add Family Members uses the same single action-card layout as My Bookings, with a plus as its trailing icon. Clip pressed-state backgrounds to the 16px card corners. Use a consistent 14px gap between option cards on Profile and Settings. Option cards and the Personal Details accordion use subtle 1px borders with no elevation or shadows. Keep health cards unchanged and retain photo elevation. Option rows show only their title, icon, count and trailing action. Personal Details and all option titles use Albert Sans Medium at weight 500. The unavailable Dark Mode setting uses muted text/icon and a disabled switch without a Disabled badge. Keep both Profile and Settings mounted and switch the Settings overlay opacity immediately in the same render, without fades or delayed effects. Returning to Profile preserves scroll position and accordion state.

Reuse shared Button, Card, Header, Skeleton, FadedScrollView, and toast primitives. Preserve Edit Profile, Family Members, My Bookings, Notifications, and Settings actions and their existing destinations. Settings behavior remains unchanged.

Use the shared ModalSurface primitive for native dialogs and custom drawer containers. Help, Privacy, and Logout use its dialog layout; existing drawer and full-screen content use its custom layout. The shared neutral backdrop token is `#00000066`, matching the onboarding dropdown. Custom layouts preserve their existing animation, transparency, controls, and keyboard behavior. Family list and creation screens apply dark status icons on focus and restore the app's light status style when leaving.

## Do's and Don'ts

- Display persisted profile and family data, signed profile photos, actual booking totals, and actual unread notification counts.
- Use skeletons during loading and toast feedback with retry actions for failed profile/family queries.
- Do not invent health values, notification totals, or verified family access.
- Do not alter backend contracts or onboarding to accommodate this layout.
- Native-device visual verification remains pending; TypeScript and whitespace checks passed.
