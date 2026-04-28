# PMGI Incident Report

A full-stack web app for reporting and managing workplace incidents, built with Next.js 16, Firebase, TypeScript, and Tailwind CSS.

## Features

- **Authentication**: Email/password and Google Sign-in via Firebase Auth
- **Incident Form**: Comprehensive form with photo uploads and signature pads
- **Role-Based Access**: Admins see all reports; users see only their own
- **Auto-Incrementing IDs**: Incident IDs formatted as IR-00001, IR-00002, etc.
- **Dashboard**: Searchable and filterable incident table
- **Firebase Backend**: Firestore for data storage, Firebase Storage for files
- **Security Rules**: Firestore and Storage rules enforcing access control

## Prerequisites

- Node.js 18+
- npm
- Firebase CLI: `npm install -g firebase-tools`

## Firebase Setup

1. Create a Firebase project at https://console.firebase.google.com
2. Enable **Authentication** → Sign-in methods: **Email/Password** and **Google**
3. Create **Firestore Database** (start in production mode)
4. Enable **Storage**
5. Go to **Project Settings** → **Your apps** → **Add web app** → copy the config values

## Environment Variables

Copy `.env.local.example` to `.env.local` and fill in the values from your Firebase config:

```bash
cp .env.local.example .env.local
```

```
NEXT_PUBLIC_FIREBASE_API_KEY=your_api_key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your_project_id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your_project.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
NEXT_PUBLIC_FIREBASE_APP_ID=your_app_id
```

## Getting Started

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## Deploying

```bash
firebase login
firebase deploy
```

## Admin Role Setup

By default all new users get the `user` role. To grant admin access:

1. Go to **Firebase Console** → **Firestore** → `users` collection
2. Find the user document (by UID)
3. Change the `role` field from `"user"` to `"admin"`

Admins can view all incident reports in the dashboard.

## Project Structure

```
src/
├── app/
│   ├── layout.tsx                        # Root layout with Navbar
│   ├── page.tsx                          # Home page (redirects based on auth)
│   ├── login/page.tsx                    # Login page
│   ├── register/page.tsx                 # Registration page
│   ├── report/page.tsx                   # New incident report form
│   └── dashboard/
│       ├── page.tsx                      # Incident list dashboard
│       └── incidents/[id]/page.tsx       # Incident detail view
├── components/
│   ├── AuthGuard.tsx                     # Route protection wrapper
│   ├── Navbar.tsx                        # Navigation bar
│   ├── IncidentForm.tsx                  # Main incident report form
│   ├── SignaturePad.tsx                  # Signature capture component
│   └── PhotoUpload.tsx                   # Photo upload with preview
├── hooks/
│   └── useAuthState.ts                   # Auth state hook with role
├── lib/
│   ├── firebase.ts                       # Firebase app initialization
│   ├── auth.ts                           # Auth helper functions
│   ├── firestore.ts                      # Firestore CRUD operations
│   └── storage.ts                        # Firebase Storage helpers
└── types/
    └── incident.ts                       # TypeScript interfaces
```

## Security Rules

- **`firestore.rules`** — Users can only read/write their own data; admins have full access
- **`storage.rules`** — Authenticated users can upload and read files in the incidents directory

## Tech Stack

| Technology | Purpose |
|---|---|
| Next.js 16 (App Router) | React framework with server/client components |
| TypeScript | Type safety |
| Tailwind CSS | Utility-first styling |
| Firebase Auth | Authentication (email + Google) |
| Firestore | NoSQL database |
| Firebase Storage | File/image storage |
| react-hook-form + zod | Form validation |
| react-signature-canvas | Signature pad |
| date-fns | Date formatting |
