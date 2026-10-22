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
    fontFamily: Inter
    fontSize: 18px
    fontWeight: 600
    lineHeight: 24px
  section:
    fontFamily: Inter
    fontSize: 19px
    fontWeight: 600
    lineHeight: 25px
  body:
    fontFamily: Inter
    fontSize: 15px
    fontWeight: 500
    lineHeight: 22px
rounded:
  card: 14px
spacing:
  page-horizontal: 20px
  section-gap: 28px
---

## Overview

This document describes only the redesigned Patient Profile overview. Shared design tokens remain authoritative. It does not authorize changes to other screens or the app's visual identity.

## Colors

Use the existing patient theme for accents, icons, readable text, and white surfaces. Match the “Learn how to book an appointment” card: white option cards with a 0.4 light gray border, teal circular icon backgrounds and white line icons.

## Typography

Use the locally loaded Inter weights through shared font-family tokens. Names and section headings establish hierarchy; secondary labels remain smaller than their saved values.

## Layout

Current top layout: use the shared gradient Header for the Profile title and top safe area. Directly below it, use one profile Card containing the photo, name, gender, Age and Blood Group, with an absolute gradient background and no intermediate padded wrapper or negative margin. Compact Age and Blood Group fields are plain Views inside that card, preserving their white surface design. Retain the existing patient gradient, a back control when provided, and white name text for contrast. Settings opens from a white circular icon in the top-right header. Personal Details and all subsequent cards remain on the white scrolling body below the gradient.

Give the profile card 16px bottom corners, no extra space between the header and identity area, and 32px bottom padding. Preserve bottom navigation. The scrolling body has a centered maximum width of 560px. In the card, place the photo on the left and the name with saved gender on the right, with compact Age and Blood Group fields below the name. Give the name row 1.5px left margin and the photo elevation 3 with an iOS shadow equivalent. Do not show a Bookings statistic in this identity area. Add Family Members is the first action card, followed by Personal Details with Edit inside its expanded body. Omit the Family Members and Quick Access headings. Render My Bookings, Transactions and Notifications as separate stacked cards; Settings is a header action. Transactions currently reports its unavailability through a toast because no payment-history screen/API exists. Long names and addresses wrap. Personal Details starts expanded and can be collapsed and uses the shared Accordion primitive.

## Elevation & Depth

Family, Personal Details, option cards and compact health cards use `surfaces.card` from `@startup/design-tokens`, matching the booking guide link. It combines `shadows.card` with a 0.4 light gray border (`#E0E5EB`). The shared tokens own these values; do not copy them into this feature. Keep the health cards' compact dimensions and the profile photo's existing elevation treatment.

## Shapes

Use a circular 88px profile image, a 20px gap before the right-hand identity column and 18px name text. Profile action cards have 14px corners, a minimum 64px row height, 16px horizontal padding and 14px icon/text spacing. Their icons sit in 36px teal circles. Match the guide's 98% width, centered within the scrolling body. Email remains within Personal Details. Buttons retain a minimum 44px touch target. Profile action rows reduce opacity to 0.75 when pressed. Do not add unrelated actions, decorative badges, or invented verification claims.

## Components

Keep the name and gender indicator in one vertically centered row. Add Family Members uses the same single action-card layout as My Bookings, with a plus as its trailing icon. Clip action presses to the 14px corners while allowing the outer shadow to remain visible. Use a consistent 14px gap between option cards. Option rows show only their title, icon, count and trailing action. Personal Details and Profile action titles use Inter SemiBold, 14px with a 19px line height. Trailing chevrons use the guide's 24px size and secondary text color. Health cards use the same white, subtly bordered 14px surface while retaining their compact layout. Settings cards use the same border and shadow while retaining their content and disabled Dark Mode control. Keep the profile photo. Keep both Profile and Settings mounted and switch the Settings overlay opacity immediately in the same render, without fades or delayed effects. Returning to Profile preserves scroll position and accordion state.

Reuse shared Button, Card, Header, Skeleton, FadedScrollView, and toast primitives. Preserve Edit Profile, Family Members, My Bookings, Notifications, and Settings actions and their existing destinations. Settings behavior remains unchanged.

Use the shared ModalSurface primitive for native dialogs and custom drawer containers. Help, Privacy, and Logout use its dialog layout; existing drawer and full-screen content use its custom layout. The shared neutral backdrop token is `#00000066`, matching the onboarding dropdown. Custom layouts preserve their existing animation, transparency, controls, and keyboard behavior. Family list and creation screens apply dark status icons on focus and restore the app's light status style when leaving.

## Do's and Don'ts

- Display persisted profile and family data, signed profile photos, actual booking totals, and actual unread notification counts.
- Use skeletons during loading and toast feedback with retry actions for failed profile/family queries.
- Do not invent health values, notification totals, or verified family access.
- Do not alter backend contracts or onboarding to accommodate this layout.
- Native-device visual verification remains pending; TypeScript and whitespace checks passed.
