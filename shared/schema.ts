import { pgTable, text, serial, integer, boolean, timestamp, date, time, primaryKey, pgEnum } from "drizzle-orm/pg-core";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import { relations } from "drizzle-orm";
import { z } from "zod";

// Enums
export const roleEnum = pgEnum('role', ['admin', 'speaker', 'user']);
export const eventStatusEnum = pgEnum('event_status', ['draft', 'published', 'cancelled', 'completed']);
export const locationType = pgEnum('location_type', ['virtual', 'in-person', 'hybrid']);

// Users Table
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  bio: text("bio"),
  role: roleEnum("role").notNull().default('user'),
  profileImage: text("profile_image"),
  signatureImage: text("signature_image"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const usersRelations = relations(users, ({ many }) => ({
  eventRegistrations: many(eventRegistrations),
  eventSpeakers: many(eventSpeakers),
}));

export const insertUserSchema = createInsertSchema(users, {
  username: (schema) => schema.min(3, "Username must be at least 3 characters"),
  password: (schema) => schema.min(6, "Password must be at least 6 characters"),
  name: (schema) => schema.min(2, "Name must be at least 2 characters"),
  email: (schema) => schema.email("Must provide a valid email"),
  role: (schema) => schema.optional(),
});

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;

// Events Table
export const events = pgTable("events", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  description: text("description").notNull(),
  eventDate: date("event_date").notNull(),
  startTime: time("start_time").notNull(),
  endTime: time("end_time").notNull(),
  venue: text("venue").notNull(),
  locationType: locationType("location_type").notNull(),
  capacity: integer("capacity").notNull(),
  status: eventStatusEnum("status").notNull().default('draft'),
  createdById: integer("created_by_id").references(() => users.id).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const eventsRelations = relations(events, ({ many, one }) => ({
  topics: many(topics),
  registrations: many(eventRegistrations),
  createdBy: one(users, {
    fields: [events.createdById],
    references: [users.id],
  }),
}));

export const insertEventSchema = createInsertSchema(events, {
  title: (schema) => schema.min(3, "Title must be at least 3 characters"),
  description: (schema) => schema.min(10, "Description must be at least 10 characters"),
  capacity: (schema) => schema.min(1, "Capacity must be at least 1"),
});

export type InsertEvent = z.infer<typeof insertEventSchema>;
export type Event = typeof events.$inferSelect;

// Topics Table
export const topics = pgTable("topics", {
  id: serial("id").primaryKey(),
  eventId: integer("event_id").references(() => events.id).notNull(),
  title: text("title").notNull(),
  description: text("description"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const topicsRelations = relations(topics, ({ one, many }) => ({
  event: one(events, {
    fields: [topics.eventId],
    references: [events.id],
  }),
  speakers: many(eventSpeakers),
}));

export const insertTopicSchema = createInsertSchema(topics, {
  title: (schema) => schema.min(2, "Title must be at least 2 characters"),
});

export type InsertTopic = z.infer<typeof insertTopicSchema>;
export type Topic = typeof topics.$inferSelect;

// Event Speakers Join Table
export const eventSpeakers = pgTable("event_speakers", {
  id: serial("id").primaryKey(),
  topicId: integer("topic_id").references(() => topics.id).notNull(),
  speakerId: integer("speaker_id").references(() => users.id).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const eventSpeakersRelations = relations(eventSpeakers, ({ one }) => ({
  topic: one(topics, {
    fields: [eventSpeakers.topicId],
    references: [topics.id],
  }),
  speaker: one(users, {
    fields: [eventSpeakers.speakerId],
    references: [users.id],
  }),
}));

// Event Registrations Table
export const eventRegistrations = pgTable("event_registrations", {
  id: serial("id").primaryKey(),
  eventId: integer("event_id").references(() => events.id).notNull(),
  userId: integer("user_id").references(() => users.id).notNull(),
  attended: boolean("attended").default(false).notNull(),
  attendanceTime: timestamp("attendance_time"),
  certificateGenerated: boolean("certificate_generated").default(false).notNull(),
  certificateUrl: text("certificate_url"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const eventRegistrationsRelations = relations(eventRegistrations, ({ one }) => ({
  event: one(events, {
    fields: [eventRegistrations.eventId],
    references: [events.id],
  }),
  user: one(users, {
    fields: [eventRegistrations.userId],
    references: [users.id],
  }),
}));

// Certificates Table
export const certificates = pgTable("certificates", {
  id: serial("id").primaryKey(),
  registrationId: integer("registration_id").references(() => eventRegistrations.id).notNull(),
  certificateUrl: text("certificate_url").notNull(),
  speakerSignature: text("speaker_signature"),
  issuedAt: timestamp("issued_at").defaultNow().notNull(),
});

export const certificatesRelations = relations(certificates, ({ one }) => ({
  registration: one(eventRegistrations, {
    fields: [certificates.registrationId],
    references: [eventRegistrations.id],
  }),
}));

// Activity Log for Dashboard Analytics
export const activityLogs = pgTable("activity_logs", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id).notNull(),
  action: text("action").notNull(),
  description: text("description").notNull(),
  timestamp: timestamp("timestamp").defaultNow().notNull(),
});

export const activityLogsRelations = relations(activityLogs, ({ one }) => ({
  user: one(users, {
    fields: [activityLogs.userId],
    references: [users.id],
  }),
}));

// Session Table for Auth
export const sessions = pgTable("sessions", {
  id: text("id").primaryKey(),
  userId: integer("user_id").references(() => users.id).notNull(),
  expiresAt: timestamp("expires_at").notNull(),
});

export const sessionsRelations = relations(sessions, ({ one }) => ({
  user: one(users, {
    fields: [sessions.userId],
    references: [users.id],
  }),
}));

// Password reset tokens
export const passwordResetTokens = pgTable("password_reset_tokens", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id, { onDelete: 'cascade' }),
  token: text("token").notNull(),
  expiresAt: timestamp("expires_at").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  used: boolean("used").default(false).notNull(),
});

export const passwordResetTokensRelations = relations(passwordResetTokens, ({ one }) => ({
  user: one(users, { fields: [passwordResetTokens.userId], references: [users.id] }),
}));
