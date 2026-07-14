import { handlers } from "@/auth";

// This is the NextAuth.js route handler.
// It handles ALL auth-related HTTP requests:
//   GET/POST /api/auth/signin
//   GET/POST /api/auth/signout
//   GET/POST /api/auth/callback/:provider
//   GET      /api/auth/session
//   GET      /api/auth/csrf
export const { GET, POST } = handlers;
