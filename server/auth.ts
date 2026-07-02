import passport from "passport";
import { Strategy as LocalStrategy } from "passport-local";
import { Strategy as GoogleStrategy } from "passport-google-oauth20";
import { Express } from "express";
import session from "express-session";
import { scrypt, randomBytes, timingSafeEqual } from "crypto";
import { promisify } from "util";
import { nanoid } from "nanoid";
import { storage } from "./storage";
import { User as SelectUser } from "@shared/schema.mysql";
import { sendWelcomeEmail } from "./services/email";

declare global {
  namespace Express {
    interface User extends SelectUser {}
  }
}

const scryptAsync = promisify(scrypt);

async function hashPassword(password: string) {
  const salt = randomBytes(16).toString("hex");
  const buf = (await scryptAsync(password, salt, 64)) as Buffer;
  return `${buf.toString("hex")}.${salt}`;
}

async function comparePasswords(supplied: string, stored: string) {
  if (!stored || !stored.includes(".")) {
    return false;
  }
  const [hashed, salt] = stored.split(".");
  if (!hashed || !salt) {
    return false;
  }
  const hashedBuf = Buffer.from(hashed, "hex");
  const suppliedBuf = (await scryptAsync(supplied, salt, 64)) as Buffer;
  return timingSafeEqual(hashedBuf, suppliedBuf);
}

export function setupAuth(app: Express) {
  // For security in production, generate a random session secret if not provided
  const sessionSecret =
    process.env.SESSION_SECRET || randomBytes(32).toString("hex"); // Generate a random secret instead of hardcoding

  const sessionSettings: session.SessionOptions = {
    secret: sessionSecret,
    resave: false,
    saveUninitialized: false,
    store: storage.sessionStore, // Use database session store
    cookie: {
      maxAge: 1000 * 60 * 60 * 24 * 7, // 1 week
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
    },
  };

  app.set("trust proxy", 1);
  app.use(session(sessionSettings));
  app.use(passport.initialize());
  app.use(passport.session());

  passport.use(
    new LocalStrategy(async (username, password, done) => {
      try {
        const user = await storage.getUserByUsername(username);
        if (!user || !(await comparePasswords(password, user.password))) {
          return done(null, false);
        } else {
          return done(null, user);
        }
      } catch (err) {
        return done(err);
      }
    }),
  );

  // Add Google OAuth Strategy if Google credentials are available
  if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
    passport.use(
      new GoogleStrategy(
        {
          clientID: process.env.GOOGLE_CLIENT_ID,
          clientSecret: process.env.GOOGLE_CLIENT_SECRET,
          callbackURL: "/api/auth/google/callback",
          scope: ["profile", "email"],
        },
        async (accessToken, refreshToken, profile, done) => {
          try {
            // Check if user exists with this Google ID
            let user = await storage.getUserByGoogleId(profile.id);

            if (!user) {
              // Create new user if one doesn't exist
              const username = `google_${profile.id}`;
              const email =
                profile.emails && profile.emails.length > 0
                  ? profile.emails[0].value
                  : `${profile.id}@google.user`;
              const displayName = profile.displayName || username;

              // Generate random password - user won't need it with OAuth
              const password = randomBytes(32).toString("hex");
              const hashedPassword = await hashPassword(password);

              // Create the user
              user = await storage.createUser({
                username,
                password: hashedPassword,
                email,
                displayName,
                googleId: profile.id,
                referralCode: nanoid(8),
                role: "user",
                avatar: profile.photos?.[0]?.value || null,
                platform: "google",
              });
            }

            return done(null, user);
          } catch (error) {
            return done(error as Error);
          }
        },
      ),
    );
  }

  passport.serializeUser((user, done) => done(null, user.id));
  passport.deserializeUser(async (id: number, done) => {
    try {
      const user = await storage.getUser(id);
      done(null, user);
    } catch (err) {
      done(err);
    }
  });

  app.post("/api/register", async (req, res, next) => {
    const existingUser = await storage.getUserByUsername(req.body.username);
    const existingUserByEmail = await storage.getUserByEmail(req.body.email);
    if (existingUser) {
      return res.status(400).send("Username already exists");
    }

    if (existingUserByEmail) {
      return res.status(400).send("Email already exists");
    }

    // Generate a unique referral code for this new user if not provided
    if (!req.body.referralCode) {
      req.body.referralCode = nanoid(8);
    }

    console.log("Sent welcome email");

    // Create the user — only safe, whitelisted fields are forwarded.
    // Sensitive fields (role, points, level, etc.) are never taken from
    // the request body to prevent mass-assignment privilege escalation.
    const user = await storage.createUser({
      username: req.body.username,
      email: req.body.email,
      password: await hashPassword(req.body.password),
      referralCode: req.body.referralCode,
      displayName: req.body.displayName || null,
      country: req.body.country || "Unknown",
      region: req.body.region || "Unknown",
      platform: "local",
      facebook_handle: req.body.facebook_handle || null,
      instagram_handle: req.body.instagram_handle || null,
      tiktok_handle: req.body.tiktok_handle || null,
      youtube_handle: req.body.youtube_handle || null,
    });

    // Process referral if a valid referrer code was provided
    if (req.body.referrerCode) {
      // Find referrer by the provided referral code
      const referrer = await storage.getUserByReferralCode(
        req.body.referrerCode,
      );
      if (referrer) {
        // Create a referral relationship and award points to the referrer
        // The addReferral method already handles updating points
        await storage.addReferral(referrer.id, user.id);
        // Check if referrer has unlocked any referral-based badges
        storage.checkAndAwardBadges(referrer.id).catch(() => {});
      }
    }

    // Send welcome email asynchronously (don't block registration)
    const referralLink = `https://4lo4lo.site/auth?ref=${user.referralCode}`;
    sendWelcomeEmail({
      username: user.username,
      email: user.email,
      referralCode: user.referralCode,
      referralLink,
    }).catch((error) => {
      console.error("Failed to send welcome email:", error);
      // Don't fail the registration if email fails
    });

    req.login(user, (err) => {
      if (err) return next(err);
      res.status(201).json(user);
    });
  });

  app.post("/api/login", passport.authenticate("local"), async (req, res) => {
    // Update login streak on successful authentication (idempotent — no-op if already checked in today)
    const userId = (req.user as SelectUser).id;
    await storage.updateLoginStreak(userId).catch(() => {});
    // Return fresh user state so streak/points/level reflect the update immediately
    const freshUser = await storage.getUser(userId).catch(() => null);
    res.status(200).json(freshUser ?? req.user);
  });

  app.post("/api/logout", (req, res, next) => {
    req.logout((err) => {
      if (err) return next(err);
      req.session.destroy((err) => {
        if (err) return next(err);
        res.clearCookie("connect.sid", { path: "/" });
        res.status(200).json({ redirectTo: "/auth" }); // Redirect to /auth instead of /login
      });
    });
  });

  app.get("/api/user", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    const userId = (req.user as SelectUser).id;
    // Update streak on session restore (idempotent — no-op if already checked in today)
    await storage.updateLoginStreak(userId).catch(() => {});
    // Return fresh user so streak/points/level are never stale immediately after restore
    const freshUser = await storage.getUser(userId).catch(() => null);
    res.json(freshUser ?? req.user);
  });

  // Google Auth routes
  app.get(
    "/api/auth/google",
    passport.authenticate("google", { scope: ["profile", "email"] }),
  );

  app.get(
    "/api/auth/google/callback",
    passport.authenticate("google", {
      failureRedirect: "/auth",
      successRedirect: "/",
    }),
  );
}
