import { db, pool } from "@db";
import { 
  users, 
  events, 
  topics, 
  eventSpeakers, 
  eventRegistrations, 
  certificates, 
  activityLogs,
  InsertUser,
  User,
  insertUserSchema,
} from "@shared/schema";
import { eq, and, desc, gt, lt, sql } from "drizzle-orm";
import session from "express-session";
import connectPg from "connect-pg-simple";

const PostgresSessionStore = connectPg(session);

export interface IStorage {
  // User methods
  createUser: (userData: InsertUser) => Promise<User>;
  getUser: (id: number) => Promise<User>;
  getUserByUsername: (username: string) => Promise<User | undefined>;
  getUserByEmail: (email: string) => Promise<User | undefined>;
  updateUser: (id: number, userData: Partial<InsertUser>) => Promise<User>;
  
  // Event methods
  createEvent: (eventData: any) => Promise<any>;
  getEvent: (id: number) => Promise<any>;
  getEvents: (filters?: any) => Promise<any[]>;
  updateEvent: (id: number, eventData: any) => Promise<any>;
  deleteEvent: (id: number) => Promise<boolean>;
  
  // Topic methods
  createTopic: (topicData: any) => Promise<any>;
  getTopicsByEventId: (eventId: number) => Promise<any[]>;
  
  // Speaker methods
  getSpeakers: () => Promise<any[]>;
  assignSpeakerToTopic: (speakerId: number, topicId: number) => Promise<any>;
  
  // Registration methods
  registerForEvent: (userId: number, eventId: number) => Promise<any>;
  cancelRegistration: (userId: number, eventId: number) => Promise<boolean>;
  getEventRegistrations: (eventId: number) => Promise<any[]>;
  getUserRegistrations: (userId: number) => Promise<any[]>;
  
  // Attendance methods
  markAttendance: (registrationId: number) => Promise<boolean>;
  
  // Certificate methods
  generateCertificate: (registrationId: number, speakerSignature?: string | null) => Promise<any>;
  getUserCertificates: (userId: number) => Promise<any[]>;
  getCertificate: (registrationId: number) => Promise<any>;
  getEventRegistration: (registrationId: number) => Promise<any>;
  
  // Activity logging
  logActivity: (userId: number, action: string, description: string) => Promise<any>;
  getRecentActivity: (limit?: number) => Promise<any[]>;
  
  // Stats methods
  getDashboardStats: () => Promise<any>;
  
  // Session store
  sessionStore: session.Store;
}

class DatabaseStorage implements IStorage {
  sessionStore: session.Store;

  constructor() {
    this.sessionStore = new PostgresSessionStore({
      pool,
      tableName: 'session', // Using the default connect-pg-simple table name
      createTableIfMissing: false, // We created the table manually
    });
  }

  // User methods
  async createUser(userData: InsertUser): Promise<User> {
    const validUserData = insertUserSchema.parse(userData);
    const [user] = await db.insert(users).values(validUserData).returning();
    return user;
  }

  async getUser(id: number): Promise<User> {
    const user = await db.query.users.findFirst({
      where: eq(users.id, id),
    });
    
    if (!user) {
      throw new Error(`User with id ${id} not found`);
    }
    
    return user;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return await db.query.users.findFirst({
      where: eq(users.username, username),
    });
  }
  
  async getUserByEmail(email: string): Promise<User | undefined> {
    return await db.query.users.findFirst({
      where: eq(users.email, email),
    });
  }

  async updateUser(id: number, userData: Partial<InsertUser>): Promise<User> {
    const [updatedUser] = await db
      .update(users)
      .set(userData)
      .where(eq(users.id, id))
      .returning();
    
    if (!updatedUser) {
      throw new Error(`User with id ${id} not found`);
    }
    
    return updatedUser;
  }

  // Event methods
  async createEvent(eventData: any): Promise<any> {
    // Extract topics to handle them separately
    const { topics, ...eventDataWithoutTopics } = eventData;
    
    const [event] = await db.insert(events).values({
      ...eventDataWithoutTopics,
      createdById: eventData.userId || eventData.createdById,
    }).returning();
    
    // Create topics and assign speakers
    if (topics && Array.isArray(topics)) {
      for (const topic of topics) {
        // Create the topic first
        const createdTopic = await this.createTopic({
          eventId: event.id,
          title: topic.title,
          description: topic.description,
        });
        
        // Assign speaker if provided and not "none"
        if (topic.speakerId && topic.speakerId !== "" && topic.speakerId !== "none") {
          const speakerId = typeof topic.speakerId === 'string' 
            ? parseInt(topic.speakerId) 
            : topic.speakerId;
            
          if (!isNaN(speakerId)) {
            await this.assignSpeakerToTopic(speakerId, createdTopic.id);
          }
        }
      }
    }
    
    // Log activity
    await this.logActivity(
      eventData.createdById || eventData.userId,
      'create_event',
      `Created new event "${event.title}"`
    );
    
    return event;
  }

  async getEvent(id: number): Promise<any> {
    const event = await db.query.events.findFirst({
      where: eq(events.id, id),
      with: {
        topics: {
          with: {
            speakers: {
              with: {
                speaker: true,
              },
            },
          },
        },
      },
    });
    
    if (!event) {
      throw new Error(`Event with id ${id} not found`);
    }
    
    // Transform topics and speakers structure to match client expectations
    const transformedTopics = event.topics.map(topic => {
      // Extract speaker objects from the join table entries
      const speakers = topic.speakers
        .filter(s => s.speaker)
        .map(s => s.speaker);
      
      return {
        id: topic.id,
        title: topic.title,
        description: topic.description,
        eventId: topic.eventId,
        speakers: speakers
      };
    });
    
    // Get registrations for the event
    const registrations = await this.getEventRegistrations(id);
    
    return {
      ...event,
      topics: transformedTopics,
      registrations,
      registrationCount: registrations.length,
      registrationPercentage: Math.min(100, Math.round((registrations.length / event.capacity) * 100)),
    };
  }

  async getEvents(filters: any = {}): Promise<any[]> {
    let query = db.query.events;
    
    // Add filters if provided
    if (filters) {
      // Implementation of filters based on the specific requirements
    }
    
    const eventsResult = await query.findMany({
      orderBy: [desc(events.eventDate)],
    });
    
    // Fetch registration counts for each event
    const eventsWithRegistrations = await Promise.all(
      eventsResult.map(async (event) => {
        const registrations = await this.getEventRegistrations(event.id);
        return {
          ...event,
          registrationCount: registrations.length,
          registrationPercentage: Math.min(100, Math.round((registrations.length / event.capacity) * 100)),
        };
      })
    );
    
    return eventsWithRegistrations;
  }

  async updateEvent(id: number, eventData: any): Promise<any> {
    const [updatedEvent] = await db
      .update(events)
      .set({
        ...eventData,
        updatedAt: new Date(),
      })
      .where(eq(events.id, id))
      .returning();
    
    if (!updatedEvent) {
      throw new Error(`Event with id ${id} not found`);
    }
    
    // Log activity
    await this.logActivity(
      eventData.userId,
      'update_event',
      `Updated event "${updatedEvent.title}"`
    );
    
    return updatedEvent;
  }

  async deleteEvent(id: number): Promise<boolean> {
    // First, delete related topics, registrations, etc.
    const eventTopics = await db.query.topics.findMany({
      where: eq(topics.eventId, id),
    });
    
    for (const topic of eventTopics) {
      await db.delete(eventSpeakers).where(eq(eventSpeakers.topicId, topic.id));
    }
    
    await db.delete(topics).where(eq(topics.eventId, id));
    
    const registrations = await db.query.eventRegistrations.findMany({
      where: eq(eventRegistrations.eventId, id),
    });
    
    for (const reg of registrations) {
      await db.delete(certificates).where(eq(certificates.registrationId, reg.id));
    }
    
    await db.delete(eventRegistrations).where(eq(eventRegistrations.eventId, id));
    
    // Finally, delete the event
    const result = await db.delete(events).where(eq(events.id, id)).returning();
    
    return result.length > 0;
  }

  // Topic methods
  async createTopic(topicData: any): Promise<any> {
    const [topic] = await db.insert(topics).values(topicData).returning();
    return topic;
  }

  async getTopicsByEventId(eventId: number): Promise<any[]> {
    return await db.query.topics.findMany({
      where: eq(topics.eventId, eventId),
      with: {
        speakers: {
          with: {
            speaker: true,
          },
        },
      },
    });
  }

  // Speaker methods
  async getSpeakers(): Promise<any[]> {
    const speakersResult = await db.query.users.findMany({
      where: eq(users.role, 'speaker'),
    });
    
    // Fetch events for each speaker
    const speakersWithEvents = await Promise.all(
      speakersResult.map(async (speaker) => {
        const speakerEvents = await db.query.eventSpeakers.findMany({
          where: eq(eventSpeakers.speakerId, speaker.id),
          with: {
            topic: {
              with: {
                event: true,
              },
            },
          },
        });
        
        // Extract unique events
        const uniqueEvents = Array.from(
          new Set(
            speakerEvents.map(se => se.topic?.event?.id)
          )
        ).filter(Boolean).map(eventId => {
          const event = speakerEvents.find(se => se.topic?.event?.id === eventId)?.topic?.event;
          return {
            id: event?.id,
            title: event?.title,
            eventDate: event?.eventDate,
          };
        });
        
        return {
          ...speaker,
          events: uniqueEvents,
        };
      })
    );
    
    return speakersWithEvents;
  }

  async assignSpeakerToTopic(speakerId: number, topicId: number): Promise<any> {
    const [assignment] = await db.insert(eventSpeakers).values({
      speakerId,
      topicId,
    }).returning();
    
    return assignment;
  }

  // Registration methods
  async registerForEvent(userId: number, eventId: number): Promise<any> {
    // Check if the user is already registered
    const existingRegistration = await db.query.eventRegistrations.findFirst({
      where: and(
        eq(eventRegistrations.userId, userId),
        eq(eventRegistrations.eventId, eventId)
      ),
    });
    
    if (existingRegistration) {
      throw new Error('User is already registered for this event');
    }
    
    // Check if the event has reached capacity
    const event = await db.query.events.findFirst({
      where: eq(events.id, eventId),
    });
    
    if (!event) {
      throw new Error('Event not found');
    }
    
    const registrations = await this.getEventRegistrations(eventId);
    
    if (registrations.length >= event.capacity) {
      throw new Error('Event has reached maximum capacity');
    }
    
    const [registration] = await db.insert(eventRegistrations).values({
      userId,
      eventId,
    }).returning();
    
    // Log activity
    await this.logActivity(
      userId,
      'register_event',
      `Registered for event "${event.title}"`
    );
    
    return registration;
  }

  async cancelRegistration(userId: number, eventId: number): Promise<boolean> {
    const result = await db.delete(eventRegistrations).where(
      and(
        eq(eventRegistrations.userId, userId),
        eq(eventRegistrations.eventId, eventId)
      )
    ).returning();
    
    // Log activity if successful
    if (result.length > 0) {
      const event = await db.query.events.findFirst({
        where: eq(events.id, eventId),
      });
      
      if (event) {
        await this.logActivity(
          userId,
          'cancel_registration',
          `Cancelled registration for event "${event.title}"`
        );
      }
    }
    
    return result.length > 0;
  }

  async getEventRegistrations(eventId: number): Promise<any[]> {
    return await db.query.eventRegistrations.findMany({
      where: eq(eventRegistrations.eventId, eventId),
      with: {
        user: true,
      },
    });
  }

  async getUserRegistrations(userId: number): Promise<any[]> {
    return await db.query.eventRegistrations.findMany({
      where: eq(eventRegistrations.userId, userId),
      with: {
        event: true,
      },
    });
  }

  // Attendance methods
  async markAttendance(registrationId: number): Promise<boolean> {
    const [updated] = await db
      .update(eventRegistrations)
      .set({
        attended: true,
        attendanceTime: new Date(),
      })
      .where(eq(eventRegistrations.id, registrationId))
      .returning();
    
    if (updated) {
      const registration = await db.query.eventRegistrations.findFirst({
        where: eq(eventRegistrations.id, registrationId),
        with: {
          user: true,
          event: true,
        },
      });
      
      if (registration && registration.user && registration.event) {
        await this.logActivity(
          registration.user.id,
          'mark_attendance',
          `Marked attendance for "${registration.event.title}"`
        );
      }
    }
    
    return !!updated;
  }

  // Certificate methods
  async generateCertificate(registrationId: number, speakerSignature?: string | null): Promise<any> {
    // Check if the registration exists and attendance is marked
    const registration = await db.query.eventRegistrations.findFirst({
      where: eq(eventRegistrations.id, registrationId),
      with: {
        user: true,
        event: true,
      },
    });
    
    if (!registration) {
      throw new Error('Registration not found');
    }
    
    if (!registration.attended) {
      throw new Error('Attendance must be marked before generating certificate');
    }
    
    if (registration.certificateGenerated) {
      throw new Error('Certificate already generated');
    }
    
    // Generate certificate URL
    const certificateUrl = `/certificates/${registration.id}`;
    
    // Update registration with certificate details
    await db
      .update(eventRegistrations)
      .set({
        certificateGenerated: true,
        certificateUrl,
      })
      .where(eq(eventRegistrations.id, registrationId));
    
    // Create certificate record
    const [certificate] = await db.insert(certificates).values({
      registrationId,
      certificateUrl,
      speakerSignature: speakerSignature || null,
    }).returning();
    
    // Log activity
    if (registration.user && registration.event) {
      await this.logActivity(
        registration.user.id,
        'generate_certificate',
        `Generated certificate for "${registration.event.title}"`
      );
    }
    
    return certificate;
  }

  async getUserCertificates(userId: number): Promise<any[]> {
    const registrations = await db.query.eventRegistrations.findMany({
      where: and(
        eq(eventRegistrations.userId, userId),
        eq(eventRegistrations.certificateGenerated, true)
      ),
      with: {
        event: true,
        user: true,
      },
    });
    
    // Get certificates to fetch the speaker signatures
    const certificateData = [];
    for (const reg of registrations) {
      const certificate = await db.query.certificates.findFirst({
        where: eq(certificates.registrationId, reg.id),
      });
      
      certificateData.push({
        id: reg.id,
        eventId: reg.eventId,
        eventTitle: reg.event?.title,
        userId: reg.userId,
        userName: reg.user?.name,
        certificateUrl: reg.certificateUrl,
        issuedAt: reg.attendanceTime,
        eventDate: reg.event?.eventDate,
        speakerSignature: certificate?.speakerSignature,
      });
    }
    
    return certificateData;
  }

  // Activity logging
  async logActivity(userId: number, action: string, description: string): Promise<any> {
    const [activity] = await db.insert(activityLogs).values({
      userId,
      action,
      description,
    }).returning();
    
    return activity;
  }

  async getRecentActivity(limit: number = 10): Promise<any[]> {
    const activities = await db.query.activityLogs.findMany({
      orderBy: [desc(activityLogs.timestamp)],
      limit,
      with: {
        user: true,
      },
    });
    
    return activities.map(activity => ({
      id: activity.id,
      user: {
        id: activity.user?.id,
        name: activity.user?.name,
        username: activity.user?.username,
        profileImage: activity.user?.profileImage,
      },
      description: activity.description,
      timestamp: activity.timestamp,
    }));
  }

  // Stats methods
  async getDashboardStats(): Promise<any> {
    // Get total events count
    const eventsCount = await db
      .select({ count: sql<number>`count(*)` })
      .from(events)
      .then(result => result[0]?.count || 0);
    
    // Get total users count
    const usersCount = await db
      .select({ count: sql<number>`count(*)` })
      .from(users)
      .then(result => result[0]?.count || 0);
    
    // Get total registrations count
    const registrationsCount = await db
      .select({ count: sql<number>`count(*)` })
      .from(eventRegistrations)
      .then(result => result[0]?.count || 0);
    
    // Get certificates issued count
    const certificatesCount = await db
      .select({ count: sql<number>`count(*)` })
      .from(certificates)
      .then(result => result[0]?.count || 0);
    
    return {
      totalEvents: eventsCount,
      totalUsers: usersCount,
      totalRegistrations: registrationsCount,
      certificatesIssued: certificatesCount,
    };
  }
}

export const storage = new DatabaseStorage();
