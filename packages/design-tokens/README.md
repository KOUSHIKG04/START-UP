# @startup/design-tokens

Design system tokens and color palettes for the Startup ecosystem.

---

## 📱 Platform & App Architecture

The ecosystem is structured into:

1. **Mobile Apps (React Native / Expo & `@startup/mobile-ui`):**
   - **Patient App:** Booking, consultations, records, plus the embedded **SOS / Emergency** panic flow.
   - **Doctor App:** Doctor dashboard, appointments, patient management, consultations.
   - **Driver App:** Ambulance driver, navigation, trip management, status updates.

2. **Web App (Next.js & `@startup/web-ui`):**
   - **Admin App:** Operations portal, provider verification, trip monitoring, analytics.

---

## 🎨 Color Palettes & Flows

### 1. Patient App (Mobile) — with Embedded SOS Flow

- **Banner / Hero Gradient:** Linear gradient from `#0A4A47` (0%) to `#087F78` (100%).

| Color              | Hex       | Role & Usage                                                 |
| ------------------ | --------- | ------------------------------------------------------------ |
| **Primary**        | `#008877` | Main brand CTA buttons, active icons, interactive highlights |
| **Primary Dark**   | `#087F78` | Pressed states, focus rings, and banner gradient stop (100%) |
| **Accent**         | `#0A9E96` | Vibrant teal accent for badges, tags, and highlights         |
| **Surface Light**  | `#E6F5F4` | Soft mint tint for card backgrounds, chips, and active pills |
| **Text Primary**   | `#0C2434` | Deep navy ink for headings, primary body copy                |
| **Text Secondary** | `#374151` | Slate gray for secondary descriptions, subtitles, metadata   |
| **Text Muted**     | `#9CA3AF` | Cool gray for disabled states, placeholders, borders         |
| **Background**     | `#F9FAFB` | Off-white canvas for screens and app shells                  |
| **Banner Start**   | `#0A4A47` | Deep spruce teal (0% gradient stop)                          |
| **Banner End**     | `#087F78` | Medium teal (100% gradient stop)                             |

#### Embedded SOS / Emergency Flow (inside Patient App):

- Accessible via `colors.patient.sos`.

| Color             | Hex       | Role & Usage                                                     |
| ----------------- | --------- | ---------------------------------------------------------------- |
| **Panic Primary** | `#EF3B43` | Urgent panic red for SOS trigger button and critical alerts      |
| **Crimson Dark**  | `#C0392B` | Dark crimson for pressed state and severe warning highlights     |
| **Surface Light** | `#FDF2F2` | Soft pink-red background for emergency banners and caution cards |
| **Header Dark**   | `#3A0508` | Deep wine blood red for emergency flow header                    |
| **Safe Accent**   | `#07595D` | Safe deep teal for canceling SOS, calling dispatch, or safe exit |
| **Background**    | `#EEF4F5` | Cool ice gray-blue for high-visibility screen background         |

---

### 2. Doctor App (Mobile)

**Doctor dashboard — appointments, patient management, consultations.**

| Color               | Hex       | Role & Usage                                                  |
| ------------------- | --------- | ------------------------------------------------------------- |
| **Primary**         | `#008877` | Primary action for medical workflows, confirm consultation    |
| **Primary Dark**    | `#097F78` | Active navigation tabs and dark accent                        |
| **Clinical Accent** | `#008F83` | Vibrant clinical teal for active consultation status          |
| **Header Dark**     | `#0B4145` | Deep forest teal for doctor dashboard header and card headers |
| **Surface Accent**  | `#D9F2EF` | Light teal wash for patient charts and active patient cards   |
| **Surface Light**   | `#E6F5F4` | Light mint tint for status pills                              |
| **Text Primary**    | `#0C2434` | Deep navy ink for patient names, clinical notes               |
| **Border**          | `#E0E5EB` | Cool neutral gray for table borders and card dividers         |

---

### 3. Driver App (Mobile)

**Ambulance driver — navigation, trip management, status updates.**

| Color              | Hex       | Role & Usage                                                     |
| ------------------ | --------- | ---------------------------------------------------------------- |
| **Primary**        | `#087F8C` | Ambulance cyan-teal for trip actions, accept button, map markers |
| **Primary Dark**   | `#173B4A` | Dark navy slate for night navigation panels and dark header      |
| **Surface Light**  | `#EAF8F7` | Soft cyan surface tint for active ride cards and route summaries |
| **Status Ready**   | `#36B37E` | Emerald green for online, available, and en-route statuses       |
| **Surface Tint**   | `#E6F5F4` | Light mint tint for secondary badges                             |
| **Text Secondary** | `#71818F` | Slate gray for ETA, trip distances, timestamps                   |
| **Text Muted**     | `#9CA3AF` | Muted slate for disabled buttons and inactive state              |
| **Text Primary**   | `#0C2434` | Deep navy ink for destination address and patient name           |

---

### 4. Admin App (Web)

**Web administration dashboard — operations, provider management, analytics.**

- **Banner / Header Gradient:** Shared brand linear gradient from `#0A4A47` (0%) to `#087F78` (100%).

| Color              | Hex       | Role & Usage                                       |
| ------------------ | --------- | -------------------------------------------------- |
| **Primary**        | `#008877` | Primary action for admin actions, approval buttons |
| **Primary Dark**   | `#087F78` | Hover/active states, banner gradient stop          |
| **Accent**         | `#0A9E96` | Metrics badges, chart highlights                   |
| **Surface Light**  | `#E6F5F4` | Data table active row highlights, filters          |
| **Text Primary**   | `#0C2434` | Deep navy ink for table text, metrics, headers     |
| **Text Secondary** | `#374151` | Slate gray for descriptions, timestamps            |
| **Border**         | `#E0E5EB` | Table grid borders, dividers                       |
| **Background**     | `#F9FAFB` | Dashboard background canvas                        |

---

## 💻 Code Usage by Platform

### Mobile (React Native / NativeWind)

The mobile NativeWind integration and semantic class documentation live in
`@startup/mobile-ui`.

### Web (Next.js / Tailwind CSS)

```tsx
import { PageShell, Banner, cn } from "@startup/web-ui";

export default function AdminDashboardPage() {
  return (
    <PageShell>
      {/* Automatically renders the Admin #0A4A47 -> #087F78 banner */}
      <Banner />

      <div className={cn("mt-6 rounded-2xl border bg-white p-6")}>
        <h3 className="text-patient-text text-xl font-bold">
          Platform Overview
        </h3>
      </div>
    </PageShell>
  );
}
```
