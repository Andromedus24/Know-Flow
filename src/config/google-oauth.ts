// Google OAuth Configuration for Know-Flow
export const GOOGLE_OAUTH_CONFIG = {
  clientId: "201689211543-he8i2qgh9n0v3ks6si99r4qbd9b0vvfs.apps.googleusercontent.com",
  clientSecret: "", // This should be kept server-side only
  redirectUri: "https://know-flow-487cd.web.app/auth/callback", // Update with your actual domain
  scopes: [
    "https://www.googleapis.com/auth/userinfo.profile",
    "https://www.googleapis.com/auth/userinfo.email"
  ]
};

// Google OAuth endpoints
export const GOOGLE_OAUTH_ENDPOINTS = {
  authorization: "https://accounts.google.com/o/oauth2/v2/auth",
  token: "https://oauth2.googleapis.com/token",
  userInfo: "https://www.googleapis.com/oauth2/v2/userinfo"
};
