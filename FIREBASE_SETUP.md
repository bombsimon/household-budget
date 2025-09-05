# Firebase Setup Guide

This document explains how to set up Firebase for the Household Budget app with multi-tenant support.

## Prerequisites

1. A Firebase project created at [Firebase Console](https://console.firebase.google.com/)
2. Firebase CLI installed (already included as dev dependency)
3. Node.js and npm installed

## Environment Configuration

### Step 1: Get Firebase Configuration

1. Go to your Firebase project in the [Firebase Console](https://console.firebase.google.com/)
2. Click on "Project Settings" (gear icon)
3. Scroll down to "Your apps" and click on the web app icon (`</>`)
4. If you don't have a web app, create one by clicking "Add app"
5. Copy the Firebase configuration object

### Step 2: Create Environment File

Create a `.env` file in the project root (copy from `.env.example`):

```bash
cp .env.example .env
```

Fill in your Firebase configuration:

```bash
VITE_FIREBASE_API_KEY=your-api-key
VITE_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your-project-id
VITE_FIREBASE_STORAGE_BUCKET=your-project.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=123456789
VITE_FIREBASE_APP_ID=1:123456789:web:abcdef
```

## Firebase Services Setup

### Step 3: Enable Firestore

1. In the Firebase Console, go to "Firestore Database"
2. Click "Create database"
3. Choose "Start in production mode" (we'll deploy our custom rules)
4. Select a location for your database

### Step 4: Deploy Security Rules

Deploy the Firestore security rules:

```bash
npm run firebase:deploy:rules
```

Or manually deploy:

```bash
npx firebase deploy --only firestore:rules
```

## Development

### Local Development with Emulators

To develop locally with Firebase emulators:

```bash
# Start the emulators
npm run firebase:emulators

# In another terminal, start the dev server
npm run dev
```

The emulators provide:
- Firestore Emulator on port 8080
- Firebase UI on http://localhost:4000

### Using Real Firebase in Development

If you want to use the real Firebase services during development, just run:

```bash
npm run dev
```

Make sure your `.env` file has the correct configuration.

## Deployment

### Step 5: Deploy to Firebase Hosting

1. **Build and deploy everything:**
   ```bash
   npm run firebase:deploy
   ```

2. **Deploy only hosting (faster for frontend updates):**
   ```bash
   npm run firebase:deploy:hosting
   ```

3. **Deploy only Firestore rules:**
   ```bash
   npm run firebase:deploy:rules
   ```

### Step 6: Configure Firebase Hosting

Your app will be available at:
```
https://your-project-id.web.app
```

Or if you have a custom domain configured:
```
https://your-custom-domain.com
```

## Multi-Tenant Architecture

### How It Works

The app supports multi-tenant architecture where each household has its own isolated data:

1. **URL Structure:** `https://your-app.com/household-id`
2. **Data Isolation:** Each household's data is stored in `/households/{householdId}`
3. **Security Rules:** Firestore rules ensure data isolation between households

### Accessing Households

Users can access households by:

1. **Entering a household ID** on the landing page
2. **Creating a new household** with a random ID
3. **Sharing URLs** like `https://your-app.com/smith-family-2025`

### Security Model

The current security rules allow anyone with the household ID to access that household's data. This provides:

- ✅ Simple sharing within households
- ✅ Data isolation between households  
- ✅ No authentication required
- ⚠️ Anyone with the URL can access the data

For production use, you might want to add:
- User authentication
- Household member management
- Rate limiting
- Audit logging

## Troubleshooting

### Common Issues

1. **"Permission denied" errors:**
   - Check that Firestore security rules are deployed
   - Verify the household ID in the URL is valid

2. **"Firebase project not found":**
   - Check your `.env` file configuration
   - Ensure the project ID matches your Firebase project

3. **Build errors:**
   - Run `npm install` to ensure all dependencies are installed
   - Check that TypeScript compilation passes: `npx tsc --noEmit`

### Useful Commands

```bash
# Check Firebase projects
npx firebase projects:list

# Initialize Firebase (if needed)
npx firebase init

# Check current configuration
npx firebase use

# View Firestore data
npx firebase firestore:data

# View hosting logs
npx firebase hosting:logs
```

## Production Considerations

For production deployments, consider:

1. **Custom Domain:** Configure a custom domain in Firebase Hosting
2. **SSL/HTTPS:** Automatically provided by Firebase Hosting
3. **CDN:** Firebase Hosting includes global CDN
4. **Security Headers:** Already configured in `firebase.json`
5. **Performance:** Static assets are cached for 1 year
6. **Monitoring:** Enable Firebase Analytics and Performance Monitoring
7. **Backup:** Regular Firestore data exports
8. **Security:** Enhanced security rules with authentication