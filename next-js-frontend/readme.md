# 🚀 Next.js Production Environment Setup Guide

## ⚙️ Purpose
This guide explains all environment variables required for the **Next.js frontend** in production.  
These variables connect your frontend to APIs, Firebase, GIF search, and backend services.  

After configuration:
- Rename `.env.example` → `.env.production`
- Never commit the actual `.env` file to GitHub.

---

## 🔹 Tenor GIF API (Public)
```env
NEXT_PUBLIC_TENOR_API_KEY=your-production-tenor-api-key
```
- Used for searching and displaying GIFs through the **Tenor API**.
- Publicly safe, as it’s client-side only (`NEXT_PUBLIC_` prefix).
- Get your key from: [https://tenor.com/developer/key](https://tenor.com/developer/key)

---

## 🔹 Firebase Configuration (Public)
```env
NEXT_PUBLIC_FIREBASE_API_KEY=your-production-firebase-api-key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your-production-firebase-auth-domain
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your-production-firebase-project-id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your-production-firebase-storage-bucket
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your-production-firebase-messaging-sender-id
NEXT_PUBLIC_FIREBASE_APP_ID=your-production-firebase-app-id
NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID=your-production-firebase-measurement-id
NEXT_PUBLIC_FIREBASE_VAPID_KEY=your-production-firebase-vapid-key
```
- Required for **Firebase SDK** (auth, Firestore, storage, messaging).
- Get these values from:
  `Firebase Console → Project Settings → General → Your Apps (Web)`.
- Add the VAPID key if using Firebase Cloud Messaging for push notifications.
- To get VAPID_KEY Go to `Firebase Console → Project Setting → Cloud Messaging → Click on generate key pair → Now you'll get a VAPID_key`.
- Example Firebase init:
  ```js
  import { initializeApp } from "firebase/app";

  const firebaseConfig = {
    apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
    authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
    projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
    storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
    appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
    measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID,
  };

  const app = initializeApp(firebaseConfig);
  ```

---

## 🔹 API URLs (Public)
```env
NEXT_PUBLIC_BASE_URL=https://your-production-api.com/api/v1
NEXT_PUBLIC_ABSOLUTE_BASE_URL=https://your-production-api.com
NEXT_PUBLIC_CLIENT_URL=https://your-production-client.com
```
- Controls the API endpoints and base URLs used by the frontend.
- Commonly used in fetch or Axios calls:
  ```js
  const res = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/auth/login`);
  ```
- `NEXT_PUBLIC_` means safe to expose to the browser.

---

## 🔹 Database Connection (Private)
```env
DATABASE_URL=your-production-database-url
DIRECT_URL=your-database-direct-url
```
- Used only in **server-side functions** (API routes, middleware).
- Never expose this variable to the browser (no `NEXT_PUBLIC_` prefix).
- Format example for DATABASE-URL:
  ```
  postgresql://postgres.user:passwd@host.pooler.supabase.com:6543/postgres?pgbouncer=true
  ```
- Format example for DIRECT_URL:
  ``` 
  postgresql://postgres.user:passwd@host.pooler.supabase.com:5432/postgres?sslmode=require
  ```
- Found in your **Supabase / PostgreSQL** project connection info.

---

## 🔹 Session Secret (Private)
```env
SESSION_SECRET=your-production-session-secret
```
- Used to encrypt or sign cookies/sessions on the server.
- Generate a secure random value:
  ```bash
  openssl rand -base64 32
  ```
- Keep it private; never expose to the browser.
- Keep it same with frontend value+JWT_SECRET.

---

## 📧 Email Configuration (Private)
```env
EMAIL=your-production-email@example.com
PASSWORD=your-production-email-password
```
- Used by **Nodemailer** to send transactional emails (OTP, password reset, etc.).
- For Gmail/Yahoo accounts, use **App Passwords**.
- Example setup:
  ```js
  import nodemailer from "nodemailer";
  const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: { user: process.env.EMAIL, pass: process.env.PASSWORD }
  });
  ```

---

## 🔏 Private Key Recovery Secret
```env
PRIVATE_KEY_RECOVERY_SECRET=your-production-secure-private-key-recovery-secret
```
- Used internally by the backend (or client-server integration) for private key recovery flow.
- Must match the **backend’s environment value**.

---

## ✅ Final Checklist
1. Copy `.env.example` → `.env.production`
2. Fill all placeholders with correct values.
3. Restart your Next.js app after editing `.env`.
4. Verify by running:
   ```bash
   echo $NEXT_PUBLIC_BASE_URL
   echo $SESSION_SECRET
   ```
5. Keep `.env.production` private (add to `.gitignore`).

---

## 🧩 Testing Tip
Add this temporary snippet in a test page:
```js
console.log(process.env.NEXT_PUBLIC_BASE_URL);
```
If it logs correctly, your environment variables are loaded successfully.
