import passport from "passport";
import { Strategy as LocalStrategy } from "passport-local";
import { Strategy as GoogleStrategy, Profile, VerifyCallback } from "passport-google-oauth20";
import { Express, Request } from "express";
import session from "express-session";
import { scrypt, randomBytes, timingSafeEqual } from "crypto";
import { promisify } from "util";
import { storage } from "./storage";
import { User as SelectUser } from "@shared/schema";

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
  const [hashed, salt] = stored.split(".");
  const hashedBuf = Buffer.from(hashed, "hex");
  const suppliedBuf = (await scryptAsync(supplied, salt, 64)) as Buffer;
  return timingSafeEqual(hashedBuf, suppliedBuf);
}

export function setupAuth(app: Express) {
  const sessionSettings: session.SessionOptions = {
    secret: process.env.SESSION_SECRET || 'eventpro-session-secret',
    resave: false,
    saveUninitialized: false,
    store: storage.sessionStore,
    cookie: {
      secure: false, // Set to false for local development
      maxAge: 1000 * 60 * 60 * 24 * 7, // 1 week
      httpOnly: true,
      sameSite: 'lax'
    }
  };

  app.set("trust proxy", 1);
  app.use(session(sessionSettings));
  app.use(passport.initialize());
  app.use(passport.session());

  passport.use(
    new LocalStrategy(async (username, password, done) => {
      try {
        console.log(`Authentication attempt for: ${username}`);
        
        // Check if input is email format
        const isEmail = username.includes('@');
        
        // Try to find the user by username or email
        let user;
        if (isEmail) {
          console.log('Trying to authenticate with email');
          user = await storage.getUserByEmail(username);
        } else {
          console.log('Trying to authenticate with username');
          user = await storage.getUserByUsername(username);
        }
        
        if (!user) {
          console.log(`User not found: ${username}`);
          return done(null, false);
        }
        
        const passwordValid = await comparePasswords(password, user.password);
        console.log(`Password validation result: ${passwordValid}`);
        
        if (!passwordValid) {
          return done(null, false);
        } else {
          return done(null, user);
        }
      } catch (error) {
        console.error('Authentication error:', error);
        return done(error);
      }
    }),
  );
  
  // Setup Google Strategy
  const CALLBACK_URL = '/api/auth/google/callback';
  console.log("Google callback URL:", CALLBACK_URL);
  
  // Get the domain from the request (will be added in the middleware)
  const getFullCallbackUrl = (req: Request) => {
    const protocol = req.headers['x-forwarded-proto'] || req.protocol;
    const host = req.headers['x-forwarded-host'] || req.get('host');
    return `${protocol}://${host}${CALLBACK_URL}`;
  };

  passport.use(
    new GoogleStrategy({
      clientID: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
      callbackURL: CALLBACK_URL,
      passReqToCallback: true
    },
    async (req, accessToken, refreshToken, profile, done) => {
      try {
        console.log('Google profile:', profile);
        
        const email = profile.emails?.[0]?.value;
        if (!email) {
          return done(new Error('No email found in Google profile'));
        }

        // Look for existing user with this email
        let user = await storage.getUserByEmail(email);
        
        // If user exists, return it
        if (user) {
          return done(null, user);
        }
        
        // Otherwise create a new user
        const username = `google_${profile.id}`;
        const name = profile.displayName || `${profile.name?.givenName || ''} ${profile.name?.familyName || ''}`.trim();
        const googlePhotoUrl = profile.photos?.[0]?.value;
        
        // Generate a random secure password - user won't need this for login
        const randomPassword = randomBytes(32).toString('hex');
        
        // Create new user
        user = await storage.createUser({
          username,
          email,
          name,
          password: await hashPassword(randomPassword),
          role: 'user',
          profileImage: googlePhotoUrl || null
        });
        
        return done(null, user);
      } catch (error) {
        console.error('Google authentication error:', error);
        return done(error as Error);
      }
    }
  ));

  passport.serializeUser((user, done) => done(null, user.id));
  passport.deserializeUser(async (id: number, done) => {
    try {
      const user = await storage.getUser(id);
      done(null, user);
    } catch (error) {
      done(error);
    }
  });

  app.post("/api/register", async (req, res, next) => {
    try {
      const existingUser = await storage.getUserByUsername(req.body.username);
      if (existingUser) {
        return res.status(400).json({ message: "Username already exists" });
      }

      const existingEmail = await storage.getUserByEmail(req.body.email);
      if (existingEmail) {
        return res.status(400).json({ message: "Email already in use" });
      }

      const user = await storage.createUser({
        ...req.body,
        password: await hashPassword(req.body.password),
      });

      req.login(user, (err) => {
        if (err) return next(err);
        res.status(201).json(user);
      });
    } catch (error) {
      next(error);
    }
  });

  app.post("/api/login", (req, res, next) => {
    console.log('Login attempt:', { username: req.body.username });
    
    passport.authenticate("local", (err: Error | null, user: Express.User | false, info: any) => {
      if (err) {
        console.error('Login error:', err);
        return next(err);
      }
      
      if (!user) {
        console.log('Login failed: Invalid credentials');
        return res.status(401).json({ message: "Invalid username or password" });
      }
      
      req.login(user, (err: Error | null) => {
        if (err) {
          console.error('Session creation error:', err);
          return next(err);
        }
        
        console.log('Login successful for user:', user.username);
        return res.status(200).json(user);
      });
    })(req, res, next);
  });

  app.post("/api/logout", (req, res, next) => {
    req.logout((err) => {
      if (err) return next(err);
      res.sendStatus(200);
    });
  });

  app.get("/api/user", (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    res.json(req.user);
  });
  
  // Google OAuth routes
  app.get("/api/auth/google", (req, res, next) => {
    // Log the full URL that Google will redirect back to
    const fullCallbackUrl = getFullCallbackUrl(req);
    console.log(`Auth initiated, callback will be at: ${fullCallbackUrl}`);
    
    // Update strategy to use dynamic callback URL
    // For Google OAuth, we need to override the static callback URL
    const googleStrategy = (passport as any).strategies?.google as GoogleStrategy;
    if (googleStrategy) {
      // Cast to any to access/modify the private _callbackURL property
      (googleStrategy as any)._callbackURL = fullCallbackUrl;
      console.log("Updated Google strategy callback URL");
    }
    
    // Standard passport authenticate with Google strategy
    passport.authenticate("google", {
      scope: ["profile", "email"]
    } as any)(req, res, next);
  });
  
  app.get(CALLBACK_URL, 
    // Standard passport callback handling
    passport.authenticate("google", {
      failureRedirect: "/auth"
    } as any),
    (req, res) => {
      // Successful authentication, redirect to home page
      console.log("Authentication successful, redirecting to home page");
      res.redirect("/");
    }
  );
}
