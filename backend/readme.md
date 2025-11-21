# 📄 Environment Setup Guide (`.env` Configuration)

## ⚙️ Purpose
This guide explains how to correctly fill and use all environment variables required for the backend.  
Every variable here controls an important service (authentication, email, database, cloud storage, etc.).  

After filling your values, rename `.env.example` → `.env.production`.

---

## 🌍 Node Environment & Server
```env
NODE_ENV=PRODUCTION
PORT=8000
CLIENT_URL=https://your-frontend-url.com
CALLBACK_URL=https://your-backend-url.com
```
- **NODE_ENV** → Always set to `PRODUCTION` for live servers, `DEVELOPMENT` for local testing.  
- **PORT** → The port your server listens on (default 8000).  
  - Local run: http://localhost:8000  
  - In Render/Vercel deployment, the platform automatically injects port.

---

## 📧 Email (for Nodemailer)
```env
EMAIL=your-email@example.com
PASSWORD=your-email-password
```
- Used by **Nodemailer** to send OTPs, password reset links, or notifications.  
- Works with **Gmail, Yahoo, Outlook**, etc.  
- If using Gmail:
  1. Enable **2-Step Verification**
  2. Generate an **App Password** → use it as `PASSWORD`.  
- Example setup:
  ```js
  nodemailer.createTransport({
    service: 'gmail',
    auth: { user: process.env.EMAIL, pass: process.env.PASSWORD }
  });
  ```

---

## 🔑 JWT (JSON Web Token)
```env
JWT_SECRET=your-secure-jwt-secret
JWT_TOKEN_EXPIRATION_DAYS=30
```
- **JWT_SECRET** → A long random string for signing login tokens.  
  Example: `openssl rand -base64 32`  
- **JWT_TOKEN_EXPIRATION_DAYS** → Duration before token expires (in days).  
- Example usage:
  ```js
  jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: `${process.env.JWT_TOKEN_EXPIRATION_DAYS}d` });
  ```

---

## 🔐 OTP & Password Reset
```env
OTP_EXPIRATION_MINUTES=5
PASSWORD_RESET_TOKEN_EXPIRATION_MINUTES=5
```
- Controls how long OTPs or password reset tokens stay valid.  
- Used by backend auth logic to expire verification codes automatically.

---

## ☁️ Cloudinary Configuration
```env
CLOUDINARY_CLOUD_NAME=your-cloudinary-cloud-name
CLOUDINARY_API_KEY=your-cloudinary-api-key
CLOUDINARY_API_SECRET=your-cloudinary-api-secret
```
- Used to upload & store images (like profile pictures).  
- Steps:
  1. Go to [Cloudinary Console](https://cloudinary.com/console)
  2. Copy your **Cloud name**, **API key**, and **API secret**.  
- Example usage:
  ```js
  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
  });
  ```

---

## 🔑 Google OAuth (for Login with Google)
```env
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret
```
- Needed to enable “Login with Google”.  
- Create credentials in [Google Cloud Console](https://console.cloud.google.com/apis/credentials):
  1. Choose “OAuth 2.0 Client ID”
  2. Set Authorised Javascript Origins → `https://your-frontend-url`
  3. Set redirect URI → `https://your-domain.com/api/v1/auth/google/callback`
  4. Also add this to redirect URI → `https://your-frontend-url/auth/oauth-redirect`
  5. Copy the client ID and secret here.

---

## 🔥 Google Application Credentials (Firebase Admin)
```env
GOOGLE_APPLICATION_CREDENTIALS=src/firebase-admin-cred.json
```
- Path to your **Firebase Admin SDK key file**.  
- Download from: **Firebase Console → Project Settings → Service Accounts → Generate new private key**.  
- Place it at `src/firebase-admin-cred.json`.

---

## 🔏 Private Key Recovery Secret
```env
PRIVATE_KEY_RECOVERY_SECRET=your-secure-private-key-recovery-secret
```
- Used internally for encrypting/decrypting recovery tokens.  
- Keep it unique and secure (64-character random string).

---

## 🗄️ Database Configuration (Supabase / PostgreSQL)
```env
DATABASE_URL=your-database-url
DIRECT_URL=your-direct-database-url
```
- **DATABASE_URL** → Used for pooled database connections.  
  Example:
  ```
  postgresql://postgres.user:passwd@host.pooler.supabase.com:6543/postgres?pgbouncer=true
  ```
- **DIRECT_URL** → Used for migrations (direct connection).  
  Example:
  ```
  postgresql://postgres.user:passwd@host.pooler.supabase.com:5432/postgres
  ```
- Find these in **Supabase → Project Settings → Database → Connection Info**.

---

## ✅ Final Checklist
1. Copy `.env.example` → `.env.production`
2. Fill all values correctly.
3. Keep `.env` secure (never commit to GitHub).
4. Restart server after every `.env` change.
5. Verify variables:
   ```bash
   echo $JWT_SECRET
   echo $DATABASE_URL
   ```
6. Ensure Email, DB, Cloudinary, Google, and Firebase services are active.

---

## 🧩 Testing Environment Variables
Add this in your backend temporarily to test:
```js
console.log(process.env.NODE_ENV);
console.log(process.env.DATABASE_URL);
```
If you see correct values, `.env` is successfully loaded.
