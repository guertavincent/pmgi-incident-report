# PMGI Incident Report

A full-stack web application for reporting and managing workplace incidents, built with **Next.js 16**, **Firebase**, **TypeScript**, and **Tailwind CSS**.

---

## Features

- **Authentication** — Email/password and Google Sign-In via Firebase Auth
- **Incident Report Form** — PMGI-style bordered form with all required fields, photo uploads (Sample 1/2/3), and signature pads for approvals
- **Role-Based Access** — Admins see all reports; regular users see only their own submissions
- **Auto-Incrementing IDs** — Incident IDs formatted as `IR-00001`, `IR-00002`, … using Firestore atomic counters
- **Dashboard** — Searchable and filterable incident table with click-through detail views
- **Firebase Backend** — Firestore for data, Firebase Storage for photos and signatures
- **Security Rules** — Firestore and Storage rules enforce role-based access control

---

## Prerequisites

| Tool | Version | Install |
|------|---------|---------|
| Node.js | 18 LTS or later | https://nodejs.org |
| npm | bundled with Node | — |
| Firebase CLI | latest | `npm install -g firebase-tools` |
| Git | any | https://git-scm.com |

---

## Firebase Setup

### 1. Create a Firebase project

1. Go to https://console.firebase.google.com and click **Add project**.
2. Enter a project name (e.g. `pmgi-incident-report`) and follow the prompts.

### 2. Enable Authentication providers

1. In your Firebase project: **Build → Authentication → Sign-in method**.
2. Enable **Email/Password**.
3. Enable **Google** (set a support email when prompted).

### 3. Create a Firestore database

1. **Build → Firestore Database → Create database**.
2. Choose **Production mode** (security rules will be deployed separately).
3. Select a region closest to your users.

### 4. Enable Cloud Storage

1. **Build → Storage → Get started**.
2. Follow the setup wizard (accept the default rules for now — you'll deploy the project's rules next).

### 5. Register a web app and copy the config

1. **Project Settings (gear icon) → Your apps → Add app → Web (`</>`)**.
2. Register the app (hosting setup is optional at this step).
3. Copy the `firebaseConfig` values — you'll need them for the next step.

---

## Environment Variables

Copy the example file and fill in your Firebase project values:

```bash
cp .env.local.example .env.local
```

Edit `.env.local`:

```
NEXT_PUBLIC_FIREBASE_API_KEY=AIzaSy...
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your-project-id.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your-project-id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your-project-id.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=123456789
NEXT_PUBLIC_FIREBASE_APP_ID=1:123456789:web:abcdef...
```

> **Note:** `.env.local` is git-ignored and never committed. Keep it secret.

---

## Running Locally

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## Setting the First Admin

By default every registered user gets the `user` role. To grant admin access:

1. Register an account in the app (or note the UID of an existing user).
2. Go to **Firebase Console → Firestore → `users` collection**.
3. Find the document whose ID matches the user's UID.
4. Change the `role` field from `"user"` to `"admin"`.

Admins can view **all** incident reports in the dashboard.

---

## Deploying to Firebase Hosting

### 1. Log in to Firebase CLI

```bash
firebase login
```

### 2. Set your project in `.firebaserc`

Edit `.firebaserc` and replace `your-firebase-project-id` with your actual project ID:

```json
{
  "projects": {
    "default": "your-actual-project-id"
  }
}
```

### 3. Enable the Web Frameworks experiment (required for Next.js)

```bash
firebase experiments:enable webframeworks
```

### 4. Deploy

```bash
firebase deploy
```

This command deploys:
- **Hosting** — your Next.js app
- **Firestore rules** — from `firestore.rules`
- **Storage rules** — from `storage.rules`

After the deploy finishes, Firebase CLI prints a **Hosting URL** such as:
```
https://your-project-id.web.app
```

### Manual (non-Framework) Deploy

If you prefer a static export:

```bash
npm run build
firebase deploy --only hosting
```

> For the full Next.js App Router experience (server components, dynamic routes), the Web Frameworks approach above is recommended.

---

## Project Structure

```
src/
├── app/
│   ├── layout.tsx                        # Root layout with Navbar
│   ├── page.tsx                          # Home (redirects based on auth)
│   ├── login/page.tsx                    # Login page
│   ├── register/page.tsx                 # Registration page
│   ├── report/page.tsx                   # New incident report form
│   └── dashboard/
│       ├── page.tsx                      # Incident list + search/filter
│       └── incidents/[id]/page.tsx       # Incident detail view
├── components/
│   ├── AuthGuard.tsx                     # Route protection wrapper
│   ├── Navbar.tsx                        # Navigation bar
│   ├── IncidentForm.tsx                  # Main incident report form
│   ├── SignaturePad.tsx                  # Signature capture component
│   └── PhotoUpload.tsx                   # Photo upload with preview
├── hooks/
│   └── useAuthState.ts                   # Auth state hook (includes role)
├── lib/
│   ├── firebase.ts                       # Firebase lazy initialization
│   ├── auth.ts                           # Auth helper functions
│   ├── firestore.ts                      # Firestore CRUD + counter
│   ├── storage.ts                        # Firebase Storage helpers
│   └── utils.ts                          # Date/timestamp utilities
└── types/
    └── incident.ts                       # TypeScript interfaces
```

---

## Data Model

### `incidents/{docId}`

| Field | Type | Description |
|-------|------|-------------|
| `incidentId` | string | Auto-generated (`IR-00001`, …) |
| `createdAt` | Timestamp | Server timestamp |
| `submittedBy` | string | User UID |
| `submittedByEmail` | string | User email |
| `reporterName` | string | |
| `dateOfIncident` | string | ISO date |
| `timeOfIncident` | string | HH:MM |
| `locationOfIncident` | string | |
| `incidentReportedBy` | string | |
| `phoneNumberOfReporter` | string | |
| `dateReported` | string | |
| `incidentReportedTo` | string | |
| `phoneWhereReported` | string | |
| `dateOfIncidentReported` | string | |
| `incidentType` | string | |
| `descriptionOfIncident` | string | |
| `peopleInvolved` | string | |
| `correctiveActionTaken` | string | |
| `actionToAvoidFuture` | string | |
| `additionalComments` | string | Optional |
| `correctiveActionApprovedBy` | string | |
| `safetyOfficerInCharge` | string | |
| `correctiveActionImplementedOn` | string | |
| `sample1Url` | string | Storage download URL |
| `sample2Url` | string | Storage download URL |
| `sample3Url` | string | Storage download URL |
| `correctiveSignatureUrl` | string | Storage download URL |
| `safetySignatureUrl` | string | Storage download URL |

### `users/{uid}`

| Field | Type | Description |
|-------|------|-------------|
| `uid` | string | Firebase Auth UID |
| `email` | string | |
| `displayName` | string | |
| `role` | `'admin' \| 'user'` | Access level |
| `createdAt` | Timestamp | |

### `counters/incidents`

| Field | Type | Description |
|-------|------|-------------|
| `nextNumber` | number | Next auto-increment value |

---

## Security Rules

### Firestore (`firestore.rules`)

- Users can only read and update their own `users/{uid}` document.
- Authenticated users can create incidents where `submittedBy == request.auth.uid`.
- Users can read their own incidents; admins can read all.
- Only admins can update or delete incidents.
- The `counters` collection is readable/writable by any authenticated user (required for the atomic counter transaction).

### Storage (`storage.rules`)

- Any authenticated user can upload to `incidents/{incidentId}/…`.
- Any authenticated user can read files in `incidents/{incidentId}/…`.

---

## Tech Stack

| Technology | Purpose |
|---|---|
| Next.js 16 (App Router) | React framework |
| TypeScript | Type safety |
| Tailwind CSS v4 | Utility-first styling |
| Firebase Auth | Authentication (email + Google) |
| Firestore | NoSQL document database |
| Firebase Storage | Photo and signature storage |
| react-hook-form + zod | Form management and validation |
| react-signature-canvas | Signature pad component |
| date-fns | Date formatting |
| ESLint + Prettier | Linting and formatting |
