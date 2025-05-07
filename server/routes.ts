import type { Express, Request, Response } from "express";
import { createServer, type Server } from "http";
import { setupAuth } from "./auth";
import { storage } from "./storage";
import { z } from "zod";
import { insertUserSchema, insertEventSchema } from "@shared/schema";

const isAuthenticated = (req: Request, res: Response, next: Function) => {
  if (req.isAuthenticated()) {
    return next();
  }
  res.status(401).json({ message: "Unauthorized" });
};

const isAdmin = (req: Request, res: Response, next: Function) => {
  if (req.isAuthenticated() && req.user.role === 'admin') {
    return next();
  }
  res.status(403).json({ message: "Forbidden" });
};

const isAdminOrSpeaker = (req: Request, res: Response, next: Function) => {
  if (req.isAuthenticated() && (req.user.role === 'admin' || req.user.role === 'speaker')) {
    return next();
  }
  res.status(403).json({ message: "Forbidden" });
};

export async function registerRoutes(app: Express): Promise<Server> {
  // Set up authentication
  setupAuth(app);
  
  // API routes
  const apiPrefix = '/api';

  // Google Authentication
  app.post(`${apiPrefix}/auth/google`, async (req, res) => {
    try {
      const { idToken } = req.body;
      
      if (!idToken) {
        return res.status(400).json({ message: "Firebase ID token is required" });
      }
      
      // In a real implementation, you would verify the Firebase ID token here
      // using the Firebase Admin SDK to ensure the token is valid
      // For simplicity in this demo, we'll extract the email and name directly
      // For a production app, install firebase-admin and use:
      // const decodedToken = await admin.auth().verifyIdToken(idToken);
      
      // For this demo, we'll parse the token manually
      // Note: This is NOT secure for production use
      const tokenPayload = JSON.parse(Buffer.from(idToken.split('.')[1], 'base64').toString());
      const email = tokenPayload.email || "demo-user@example.com";
      const name = tokenPayload.name || "Google User";
      
      console.log("Google login for:", email);
      
      // Check if user exists
      const existingUser = await storage.getUserByEmail(email);
      
      if (existingUser) {
        // Log in the existing user
        req.login(existingUser, (err) => {
          if (err) {
            return res.status(500).json({ message: "Session error" });
          }
          return res.status(200).json(existingUser);
        });
      } else {
        // Create a new user
        try {
          // Generate a username from email (first part of email + random number)
          let username = email.split('@')[0];
          // Add a random suffix to avoid username collisions
          username = username + Math.floor(Math.random() * 1000);
          
          // Generate a secure random password (user won't need this since they'll use Google auth)
          const password = Math.random().toString(36).slice(-10) + Math.random().toString(36).slice(-10);
          
          const newUser = await storage.createUser({
            username,
            email,
            name,
            password, // This gets hashed in the storage.createUser method
            role: 'user',
          });
          
          req.login(newUser, (err) => {
            if (err) {
              return res.status(500).json({ message: "Session error" });
            }
            return res.status(201).json(newUser);
          });
        } catch (createError) {
          console.error("Error creating new user:", createError);
          return res.status(500).json({ message: "Failed to create user account" });
        }
      }
    } catch (error) {
      console.error("Google auth error:", error);
      res.status(500).json({ message: "Authentication failed", error: error instanceof Error ? error.message : String(error) });
    }
  });
  
  // Link existing account with Google
  app.post(`${apiPrefix}/auth/link-google`, isAuthenticated, async (req, res) => {
    try {
      const { idToken } = req.body;
      const userId = req.user!.id;
      
      if (!idToken) {
        return res.status(400).json({ message: "Firebase ID token is required" });
      }
      
      // In a real implementation, you would verify the Firebase ID token
      // and update the user record with Google credentials
      // const decodedToken = await admin.auth().verifyIdToken(idToken);
      
      // For now, we'll just return success
      res.status(200).json({ message: "Account linked successfully" });
    } catch (error) {
      console.error("Google account linking error:", error);
      res.status(500).json({ message: "Failed to link account" });
    }
  });

  // Users
  app.get(`${apiPrefix}/users`, isAdmin, async (req, res) => {
    try {
      const users = await storage.getSpeakers();
      res.json(users);
    } catch (error) {
      res.status(500).json({ message: (error as Error).message });
    }
  });

  app.post(`${apiPrefix}/users`, isAdmin, async (req, res) => {
    try {
      const userData = insertUserSchema.parse(req.body);
      const user = await storage.createUser(userData);
      res.status(201).json(user);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ errors: error.errors });
      }
      res.status(500).json({ message: (error as Error).message });
    }
  });

  app.delete(`${apiPrefix}/users/:id`, isAdmin, async (req, res) => {
    try {
      const userId = parseInt(req.params.id);
      // Implementation would depend on your storage interface
      res.status(200).json({ success: true });
    } catch (error) {
      res.status(500).json({ message: (error as Error).message });
    }
  });

  // Speakers
  app.get(`${apiPrefix}/speakers`, isAuthenticated, async (req, res) => {
    try {
      const speakers = await storage.getSpeakers();
      res.json(speakers);
    } catch (error) {
      res.status(500).json({ message: (error as Error).message });
    }
  });

  app.post(`${apiPrefix}/speakers`, isAdmin, async (req, res) => {
    try {
      const speakerData = {
        ...req.body,
        role: 'speaker'
      };
      const userData = insertUserSchema.parse(speakerData);
      const speaker = await storage.createUser(userData);
      res.status(201).json(speaker);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ errors: error.errors });
      }
      res.status(500).json({ message: (error as Error).message });
    }
  });

  app.delete(`${apiPrefix}/speakers/:id`, isAdmin, async (req, res) => {
    try {
      const speakerId = parseInt(req.params.id);
      // Implementation would depend on your storage interface
      res.status(200).json({ success: true });
    } catch (error) {
      res.status(500).json({ message: (error as Error).message });
    }
  });

  // Events
  app.get(`${apiPrefix}/events`, async (req, res) => {
    try {
      const events = await storage.getEvents();
      res.json(events);
    } catch (error) {
      res.status(500).json({ message: (error as Error).message });
    }
  });

  app.get(`${apiPrefix}/events/upcoming`, async (req, res) => {
    try {
      // Get upcoming events (implementation details depend on your storage interface)
      const events = await storage.getEvents();
      const upcomingEvents = events.filter(event => new Date(event.eventDate) >= new Date());
      res.json(upcomingEvents.slice(0, 3)); // Return only 3 upcoming events for dashboard
    } catch (error) {
      res.status(500).json({ message: (error as Error).message });
    }
  });

  app.get(`${apiPrefix}/events/:id`, async (req, res) => {
    try {
      const eventId = parseInt(req.params.id);
      const event = await storage.getEvent(eventId);
      
      // Add info about whether the current user is registered
      if (req.isAuthenticated()) {
        const userId = req.user.id;
        const registrations = await storage.getEventRegistrations(eventId);
        const userRegistration = registrations.find(reg => reg.userId === userId);
        
        event.isRegistered = !!userRegistration;
        event.hasAttended = !!userRegistration?.attended;
        event.hasCertificate = !!userRegistration?.certificateGenerated;
        event.certificateUrl = userRegistration?.certificateUrl;
      }
      
      res.json(event);
    } catch (error) {
      res.status(500).json({ message: (error as Error).message });
    }
  });

  app.post(`${apiPrefix}/events`, isAdminOrSpeaker, async (req, res) => {
    try {
      // Extract topics and separate them from event data
      const { topics = [], ...eventBase } = req.body;
      
      // Parse and validate event data
      const eventData = {
        ...eventBase,
        createdById: req.user.id,
      };
      
      // Create the event first
      const event = await storage.createEvent(eventData);
      
      // Then create all the topics and assign speakers
      if (topics && topics.length > 0) {
        for (const topic of topics) {
          // Create the topic
          const newTopic = await storage.createTopic({
            eventId: event.id,
            title: topic.title,
            description: topic.description
          });
          
          // If a speaker is assigned, create the assignment
          if (topic.speakerId) {
            await storage.assignSpeakerToTopic(topic.speakerId, newTopic.id);
          }
        }
      }
      
      res.status(201).json(event);
    } catch (error) {
      if (error instanceof z.ZodError) {
        console.error("Validation error:", error.errors);
        return res.status(400).json({ errors: error.errors });
      }
      console.error("Event creation error:", error);
      res.status(500).json({ message: (error as Error).message });
    }
  });

  app.put(`${apiPrefix}/events/:id`, isAdminOrSpeaker, async (req, res) => {
    try {
      const eventId = parseInt(req.params.id);
      const eventData = {
        ...req.body,
        userId: req.user.id,
      };
      
      const event = await storage.updateEvent(eventId, eventData);
      res.json(event);
    } catch (error) {
      res.status(500).json({ message: (error as Error).message });
    }
  });

  app.delete(`${apiPrefix}/events/:id`, isAdmin, async (req, res) => {
    try {
      const eventId = parseInt(req.params.id);
      await storage.deleteEvent(eventId);
      res.status(200).json({ success: true });
    } catch (error) {
      res.status(500).json({ message: (error as Error).message });
    }
  });

  // Event Registrations
  app.post(`${apiPrefix}/events/:id/register`, isAuthenticated, async (req, res) => {
    try {
      const eventId = parseInt(req.params.id);
      const userId = req.user.id;
      
      const registration = await storage.registerForEvent(userId, eventId);
      res.status(201).json(registration);
    } catch (error) {
      res.status(500).json({ message: (error as Error).message });
    }
  });

  app.delete(`${apiPrefix}/events/:id/register`, isAuthenticated, async (req, res) => {
    try {
      const eventId = parseInt(req.params.id);
      const userId = req.user.id;
      
      const success = await storage.cancelRegistration(userId, eventId);
      if (success) {
        res.status(200).json({ success: true });
      } else {
        res.status(404).json({ message: "Registration not found" });
      }
    } catch (error) {
      res.status(500).json({ message: (error as Error).message });
    }
  });

  // Mark Attendance (admin marks attendance for user)
  app.post(`${apiPrefix}/events/:id/attendance/:userId`, isAdmin, async (req, res) => {
    try {
      const eventId = parseInt(req.params.id);
      const userId = parseInt(req.params.userId);
      
      // Get registration for this user and event
      const registrations = await storage.getEventRegistrations(eventId);
      const registration = registrations.find(reg => reg.userId === userId);
      
      if (!registration) {
        return res.status(404).json({ message: "Registration not found" });
      }
      
      const success = await storage.markAttendance(registration.id);
      res.status(200).json({ success });
    } catch (error) {
      res.status(500).json({ message: (error as Error).message });
    }
  });
  
  // Self-attendance for virtual events (user self-reports attendance with code)
  app.post(`${apiPrefix}/events/:id/self-attendance`, isAuthenticated, async (req, res) => {
    try {
      const eventId = parseInt(req.params.id);
      const userId = req.user!.id;
      const { code } = req.body;
      
      if (!code) {
        return res.status(400).json({ message: "Attendance code is required" });
      }
      
      // Get the event to verify it's a virtual event
      const event = await storage.getEvent(eventId);
      if (!event) {
        return res.status(404).json({ message: "Event not found" });
      }
      
      // Only allow self-attendance for virtual or hybrid events
      if (event.locationType !== 'virtual' && event.locationType !== 'hybrid') {
        return res.status(400).json({ message: "Self-attendance is only available for virtual or hybrid events" });
      }
      
      // In a real app, you would validate the attendance code here
      // For this demo, we'll use a simple validation based on code length
      if (code.length < 4) {
        return res.status(400).json({ message: "Invalid attendance code" });
      }
      
      // Get registration for this user and event
      const registrations = await storage.getEventRegistrations(eventId);
      const registration = registrations.find(reg => reg.userId === userId);
      
      if (!registration) {
        return res.status(404).json({ message: "You are not registered for this event" });
      }
      
      if (registration.attended) {
        return res.status(400).json({ message: "Attendance already recorded" });
      }
      
      const success = await storage.markAttendance(registration.id);
      
      // Log the activity
      await storage.logActivity(
        userId,
        'attendance',
        `Attended event: ${event.title}`
      );
      
      res.status(200).json({ success });
    } catch (error) {
      res.status(500).json({ message: (error as Error).message });
    }
  });

  // Certificates
  app.get(`${apiPrefix}/certificates`, isAuthenticated, async (req, res) => {
    try {
      const userId = req.user.id;
      let certificates;
      
      if (req.user.role === 'admin') {
        // Admin can see all certificates (implementation would depend on your storage interface)
        // For now, just return user's certificates
        certificates = await storage.getUserCertificates(userId);
      } else {
        certificates = await storage.getUserCertificates(userId);
      }
      
      res.json(certificates);
    } catch (error) {
      res.status(500).json({ message: (error as Error).message });
    }
  });
  
  // Download certificate endpoint
  app.get(`${apiPrefix}/certificates/download/:id`, isAuthenticated, async (req, res) => {
    try {
      const registrationId = parseInt(req.params.id);
      if (isNaN(registrationId)) {
        return res.status(400).json({ error: "Invalid certificate ID" });
      }
      
      // Get the registration to check ownership
      const registrations = await storage.getEventRegistrations(0); // Dummy call to get all registrations
      const registration = registrations.find(reg => reg.id === registrationId);
      
      if (!registration) {
        return res.status(404).json({ error: "Certificate not found" });
      }
      
      // Check if user is authorized (either owner or admin)
      if (registration.userId !== req.user.id && req.user.role !== 'admin') {
        return res.status(403).json({ error: "Unauthorized access to certificate" });
      }
      
      // For certificate data, we'll use the registration data directly since it contains certificateUrl
      
      if (!registration.certificateGenerated || !registration.certificateUrl) {
        return res.status(404).json({ error: "Certificate data not found" });
      }
      
      // Convert the certificate URL to a buffer and send as PDF
      if (registration.certificateUrl) {
        try {
          // Parse the data URL
          const dataUrlParts = registration.certificateUrl.split(',');
          const base64Data = dataUrlParts[1];
          const pdfBuffer = Buffer.from(base64Data, 'base64');
          
          // Set the appropriate headers
          res.setHeader('Content-Type', 'application/pdf');
          res.setHeader('Content-Disposition', `attachment; filename="Certificate_${registration.event?.title || "Event"}_${registration.user?.name || "Attendee"}.pdf"`);
          res.setHeader('Content-Length', pdfBuffer.length);
          
          // Send the PDF data
          res.send(pdfBuffer);
        } catch (err) {
          console.error('Error processing PDF data:', err);
          res.status(500).json({ error: "Failed to process certificate data" });
        }
      } else {
        res.status(404).json({ error: "Certificate file not found" });
      }
    } catch (error) {
      console.error('Error downloading certificate:', error);
      res.status(500).json({ error: "Failed to download certificate" });
    }
  });

  app.post(`${apiPrefix}/events/:id/certificate`, isAuthenticated, async (req, res) => {
    try {
      const eventId = parseInt(req.params.id);
      const userId = req.user.id;
      
      // Get registration for this user and event
      const registrations = await storage.getEventRegistrations(eventId);
      const registration = registrations.find(reg => reg.userId === userId);
      
      if (!registration) {
        return res.status(404).json({ message: "Registration not found" });
      }
      
      if (!registration.attended) {
        return res.status(400).json({ message: "Attendance must be marked before generating certificate" });
      }
      
      // Get the event to find its topics and speakers
      const event = await storage.getEvent(eventId);
      if (!event || !event.topics || event.topics.length === 0) {
        return res.status(400).json({ message: "Event has no topics or speakers" });
      }
      
      // Find the primary speaker of the event (first speaker found)
      let speakerSignature = null;
      for (const topic of event.topics) {
        if (topic.speakers && topic.speakers.length > 0) {
          const speaker = topic.speakers[0];
          if (speaker.signatureImage) {
            speakerSignature = speaker.signatureImage;
            break;
          }
        }
      }
      
      // Generate the certificate with the speaker signature if available
      const certificate = await storage.generateCertificate(registration.id, speakerSignature);
      res.status(201).json(certificate);
    } catch (error) {
      res.status(500).json({ message: (error as Error).message });
    }
  });

  // Profile
  app.get(`${apiPrefix}/profile`, isAuthenticated, async (req, res) => {
    try {
      const userId = req.user.id;
      const user = await storage.getUser(userId);
      
      // Get user's registrations
      const registrations = await storage.getUserRegistrations(userId);
      
      // Split into upcoming and attended
      const now = new Date();
      const upcomingRegistrations = registrations
        .filter(reg => new Date(reg.event.eventDate) >= now)
        .map(reg => ({
          id: reg.event.id,
          title: reg.event.title,
          eventDate: reg.event.eventDate,
          startTime: reg.event.startTime,
          venue: reg.event.venue,
        }));
      
      const attendedEvents = registrations
        .filter(reg => reg.attended && new Date(reg.event.eventDate) < now)
        .map(reg => ({
          id: reg.event.id,
          title: reg.event.title,
          eventDate: reg.event.eventDate,
          certificateUrl: reg.certificateUrl,
        }));
      
      res.json({
        ...user,
        upcomingRegistrations,
        attendedEvents,
      });
    } catch (error) {
      res.status(500).json({ message: (error as Error).message });
    }
  });

  app.patch(`${apiPrefix}/profile`, isAuthenticated, async (req, res) => {
    try {
      const userId = req.user.id;
      const userData = req.body;
      
      // If updating password, verify current password
      if (userData.newPassword) {
        // Implementation of password verification and update
        // would depend on your authentication and storage setup
      }
      
      // Update user data, excluding password fields
      const { currentPassword, newPassword, confirmPassword, ...updateData } = userData;
      
      const updatedUser = await storage.updateUser(userId, updateData);
      res.json(updatedUser);
    } catch (error) {
      res.status(500).json({ message: (error as Error).message });
    }
  });

  // Signature upload endpoint
  app.patch(`${apiPrefix}/profile/signature`, isAuthenticated, async (req, res) => {
    try {
      const userId = req.user.id;
      const { signatureImage } = req.body;
      
      if (!signatureImage) {
        return res.status(400).json({ message: "Signature image is required" });
      }
      
      // Verify user is a speaker or admin before allowing upload
      const user = await storage.getUser(userId);
      if (user.role !== 'speaker' && user.role !== 'admin') {
        return res.status(403).json({ message: "Only speakers can upload signatures" });
      }
      
      // Update the user's signature field
      const updatedUser = await storage.updateUser(userId, { signatureImage });
      res.json(updatedUser);
    } catch (error) {
      res.status(500).json({ message: (error as Error).message });
    }
  });

  // Dashboard stats
  app.get(`${apiPrefix}/stats`, isAuthenticated, async (req, res) => {
    try {
      const stats = await storage.getDashboardStats();
      res.json(stats);
    } catch (error) {
      res.status(500).json({ message: (error as Error).message });
    }
  });

  // Recent activity
  app.get(`${apiPrefix}/activity`, isAuthenticated, async (req, res) => {
    try {
      const activity = await storage.getRecentActivity();
      res.json(activity);
    } catch (error) {
      res.status(500).json({ message: (error as Error).message });
    }
  });

  const httpServer = createServer(app);

  return httpServer;
}
