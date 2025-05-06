import { db } from "./index";
import * as schema from "@shared/schema";
import { scrypt, randomBytes } from "crypto";
import { promisify } from "util";

const scryptAsync = promisify(scrypt);

async function hashPassword(password: string) {
  const salt = randomBytes(16).toString("hex");
  const buf = (await scryptAsync(password, salt, 64)) as Buffer;
  return `${buf.toString("hex")}.${salt}`;
}

async function seed() {
  try {
    console.log("Starting database seeding...");

    // Check if we already have users
    const existingUsers = await db.query.users.findMany();
    if (existingUsers.length > 0) {
      console.log("Database already has users, skipping seeding");
      return;
    }

    // Create admin user
    const adminPassword = await hashPassword("admin123");
    const [admin] = await db.insert(schema.users).values({
      username: "admin",
      password: adminPassword,
      name: "Admin User",
      email: "admin@eventpro.com",
      role: "admin",
      bio: "System administrator",
      profileImage: null,
    }).returning();
    
    console.log("Created admin user:", admin.username);

    // Create some speakers
    const speakerPasswords = await Promise.all([
      hashPassword("speaker123"),
      hashPassword("speaker123"),
      hashPassword("speaker123")
    ]);
    
    const speakerData = [
      {
        username: "johndoe",
        password: speakerPasswords[0],
        name: "John Doe",
        email: "john.doe@example.com",
        role: "speaker",
        bio: "Expert in DevOps and cloud infrastructure with over 10 years of experience.",
        profileImage: null,
      },
      {
        username: "janesmith",
        password: speakerPasswords[1],
        name: "Jane Smith",
        email: "jane.smith@example.com",
        role: "speaker",
        bio: "UX design professional specializing in user research and prototyping.",
        profileImage: null,
      },
      {
        username: "michaelwilson",
        password: speakerPasswords[2],
        name: "Michael Wilson",
        email: "michael.wilson@example.com",
        role: "speaker",
        bio: "AI and machine learning researcher with publications in top conferences.",
        profileImage: null,
      }
    ];
    
    const speakers = await Promise.all(
      speakerData.map(async (speaker) => {
        const [newSpeaker] = await db.insert(schema.users).values(speaker).returning();
        console.log("Created speaker:", newSpeaker.username);
        return newSpeaker;
      })
    );

    // Create some regular users
    const userPasswords = await Promise.all([
      hashPassword("user123"),
      hashPassword("user123"),
      hashPassword("user123")
    ]);
    
    const userData = [
      {
        username: "sarahwilliams",
        password: userPasswords[0],
        name: "Sarah Williams",
        email: "sarah.williams@example.com",
        role: "user",
        bio: null,
        profileImage: null,
      },
      {
        username: "robertjohnson",
        password: userPasswords[1],
        name: "Robert Johnson",
        email: "robert.johnson@example.com",
        role: "user",
        bio: null,
        profileImage: null,
      },
      {
        username: "emilybrown",
        password: userPasswords[2],
        name: "Emily Brown",
        email: "emily.brown@example.com",
        role: "user",
        bio: null,
        profileImage: null,
      }
    ];
    
    const users = await Promise.all(
      userData.map(async (user) => {
        const [newUser] = await db.insert(schema.users).values(user).returning();
        console.log("Created user:", newUser.username);
        return newUser;
      })
    );

    // Create events
    const eventData = [
      {
        title: "DevOps Summit 2023",
        description: "Join industry experts to discuss the latest trends in DevOps, CI/CD pipelines, and cloud infrastructure management.",
        eventDate: new Date(2023, 9, 15), // Oct 15, 2023
        startTime: "09:00:00",
        endTime: "17:00:00",
        venue: "Virtual Event",
        locationType: "virtual",
        capacity: 100,
        status: "published",
        createdById: admin.id,
      },
      {
        title: "UX Design Workshop",
        description: "A hands-on workshop focused on user experience design principles, user research methods, and prototyping tools.",
        eventDate: new Date(2023, 10, 5), // Nov 5, 2023
        startTime: "10:00:00",
        endTime: "16:00:00",
        venue: "Tech Hub, San Francisco",
        locationType: "in-person",
        capacity: 40,
        status: "published",
        createdById: admin.id,
      },
      {
        title: "AI and Machine Learning Conference",
        description: "Explore the cutting-edge advancements in artificial intelligence and machine learning with world-renowned experts.",
        eventDate: new Date(2023, 11, 10), // Dec 10, 2023
        startTime: "09:00:00",
        endTime: "18:00:00",
        venue: "Grand Convention Center, New York",
        locationType: "in-person",
        capacity: 200,
        status: "published",
        createdById: admin.id,
      },
      {
        title: "Cybersecurity Conference",
        description: "Learn about the latest threats, defensive strategies, and compliance requirements in the cybersecurity landscape.",
        eventDate: new Date(2024, 0, 20), // Jan 20, 2024
        startTime: "09:00:00",
        endTime: "17:00:00",
        venue: "Virtual Event",
        locationType: "virtual",
        capacity: 500,
        status: "draft",
        createdById: admin.id,
      }
    ];
    
    const events = await Promise.all(
      eventData.map(async (event) => {
        const [newEvent] = await db.insert(schema.events).values(event).returning();
        console.log("Created event:", newEvent.title);
        return newEvent;
      })
    );

    // Create topics for events
    const topicsData = [
      // DevOps Summit topics
      {
        eventId: events[0].id,
        title: "CI/CD Pipeline Optimization",
        description: "Best practices for efficient CI/CD pipelines"
      },
      {
        eventId: events[0].id,
        title: "Kubernetes in Production",
        description: "Real-world experiences with Kubernetes deployments"
      },
      // UX Design Workshop topics
      {
        eventId: events[1].id,
        title: "User Research Methods",
        description: "Effective techniques for gathering user insights"
      },
      {
        eventId: events[1].id,
        title: "Prototyping Tools",
        description: "Comparison of popular prototyping tools"
      },
      // AI Conference topics
      {
        eventId: events[2].id,
        title: "Deep Learning Advances",
        description: "Recent breakthroughs in deep learning research"
      },
      {
        eventId: events[2].id,
        title: "AI Ethics",
        description: "Ethical considerations in AI development"
      },
      // Cybersecurity Conference topics
      {
        eventId: events[3].id,
        title: "Threat Intelligence",
        description: "Latest trends in cyber threats"
      },
      {
        eventId: events[3].id,
        title: "Security Compliance",
        description: "Navigating regulatory requirements"
      }
    ];
    
    const topics = await Promise.all(
      topicsData.map(async (topic) => {
        const [newTopic] = await db.insert(schema.topics).values(topic).returning();
        console.log("Created topic:", newTopic.title);
        return newTopic;
      })
    );

    // Assign speakers to topics
    const speakerAssignments = [
      { topicId: topics[0].id, speakerId: speakers[0].id },
      { topicId: topics[1].id, speakerId: speakers[0].id },
      { topicId: topics[2].id, speakerId: speakers[1].id },
      { topicId: topics[3].id, speakerId: speakers[1].id },
      { topicId: topics[4].id, speakerId: speakers[2].id },
      { topicId: topics[5].id, speakerId: speakers[2].id }
    ];
    
    await Promise.all(
      speakerAssignments.map(async (assignment) => {
        const [newAssignment] = await db.insert(schema.eventSpeakers).values(assignment).returning();
        console.log(`Assigned speaker ${assignment.speakerId} to topic ${assignment.topicId}`);
        return newAssignment;
      })
    );

    // Register users for events
    const registrationsData = [
      { userId: users[0].id, eventId: events[0].id, attended: true, attendanceTime: new Date() },
      { userId: users[0].id, eventId: events[1].id, attended: false },
      { userId: users[1].id, eventId: events[0].id, attended: true, attendanceTime: new Date() },
      { userId: users[1].id, eventId: events[2].id, attended: false },
      { userId: users[2].id, eventId: events[1].id, attended: true, attendanceTime: new Date() }
    ];
    
    const registrations = await Promise.all(
      registrationsData.map(async (registration) => {
        const [newRegistration] = await db.insert(schema.eventRegistrations).values(registration).returning();
        console.log(`Registered user ${registration.userId} for event ${registration.eventId}`);
        return newRegistration;
      })
    );

    // Generate certificates for attended events
    const certificatesData = [
      { 
        registrationId: registrations[0].id, 
        certificateUrl: `/certificates/${registrations[0].id}` 
      },
      { 
        registrationId: registrations[2].id, 
        certificateUrl: `/certificates/${registrations[2].id}` 
      },
      { 
        registrationId: registrations[4].id, 
        certificateUrl: `/certificates/${registrations[4].id}` 
      }
    ];
    
    await Promise.all(
      certificatesData.map(async (certificate) => {
        const [newCertificate] = await db.insert(schema.certificates).values(certificate).returning();
        
        // Also update the registration record
        await db.update(schema.eventRegistrations)
          .set({ 
            certificateGenerated: true,
            certificateUrl: certificate.certificateUrl 
          })
          .where(eq(schema.eventRegistrations.id, certificate.registrationId));
        
        console.log(`Generated certificate for registration ${certificate.registrationId}`);
        return newCertificate;
      })
    );

    // Log some activities
    const activitiesData = [
      {
        userId: users[0].id,
        action: "register_event",
        description: "Sarah Williams registered for \"DevOps Summit 2023\"",
        timestamp: new Date(Date.now() - 10 * 60000) // 10 minutes ago
      },
      {
        userId: admin.id,
        action: "create_event",
        description: "Admin User created new event \"Machine Learning Conference 2023\"",
        timestamp: new Date(Date.now() - 60 * 60000) // 1 hour ago
      },
      {
        userId: users[2].id,
        action: "download_certificate",
        description: "Emily Brown downloaded certificate for \"UX Design Workshop\"",
        timestamp: new Date(Date.now() - 3 * 60 * 60000) // 3 hours ago
      }
    ];
    
    await Promise.all(
      activitiesData.map(async (activity) => {
        const [newActivity] = await db.insert(schema.activityLogs).values(activity).returning();
        console.log(`Logged activity: ${activity.description}`);
        return newActivity;
      })
    );

    console.log("Database seeding completed successfully!");
  } catch (error) {
    console.error("Error during database seeding:", error);
  }
}

seed();
