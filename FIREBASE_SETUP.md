# Firebase Setup Instructions for Know-Flow

## Current Status
✅ Firebase project created: `know-flow-487cd`
✅ Hosting deployed to: https://know-flow-487cd.web.app
✅ Firebase configuration files created
⚠️ Firestore database needs to be enabled

## Next Steps to Complete Firebase Setup

### 1. Enable Firestore Database
1. Go to [Firebase Console](https://console.firebase.google.com/project/know-flow-487cd/overview)
2. Click on "Firestore Database" in the left sidebar
3. Click "Create database"
4. Choose "Start in test mode" for development (you can update security rules later)
5. Select a location (recommended: `us-central1`)
6. Click "Done"

### 2. Get Firebase Configuration
1. In Firebase Console, go to Project Settings (gear icon)
2. Scroll down to "Your apps" section
3. Click on the web app or create a new one
4. Copy the configuration object
5. Update `src/config/firebase.ts` with your actual values:
   - `apiKey`
   - `messagingSenderId`
   - `appId`

### 3. Deploy Firestore Rules and Indexes
After enabling Firestore, run:
```bash
npx firebase-tools deploy --only firestore:rules,firestore:indexes
```

### 4. Test Firebase Connection
1. Build your project: `npm run build`
2. Deploy to Firebase: `npx firebase-tools deploy --only hosting`
3. Test authentication and database operations

## Firebase Services Available
- **Authentication**: User signup/login
- **Firestore**: Database for user data, goals, lessons, etc.
- **Storage**: File uploads (avatars, documents)
- **Hosting**: Web app hosting

## Security Rules
Firestore security rules are configured to:
- Allow users to read/write only their own data
- Make concepts publicly readable
- Restrict admin operations to authenticated admins

## Development
To run Firebase emulators locally:
```bash
npx firebase-tools emulators:start
```

## Deployment
To deploy all services:
```bash
npx firebase-tools deploy
```

## Support
- [Firebase Documentation](https://firebase.google.com/docs)
- [Firebase Console](https://console.firebase.google.com/project/know-flow-487cd)
- [Hosting URL](https://know-flow-487cd.web.app)
