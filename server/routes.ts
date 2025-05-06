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

  // Mark Attendance
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
      
      const certificate = await storage.generateCertificate(registration.id);
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
