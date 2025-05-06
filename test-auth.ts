import { scrypt, randomBytes, timingSafeEqual } from "crypto";
import { promisify } from "util";
import { db } from "./db";
import { users } from "./shared/schema";
import { eq } from "drizzle-orm";

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

async function testAuth() {
  console.log("Testing authentication...");
  
  // Retrieve the admin user
  const admin = await db.query.users.findFirst({
    where: eq(users.username, "admin"),
  });
  
  if (!admin) {
    console.error("Admin user not found");
    return;
  }
  
  console.log("Admin user found:", admin.username);
  console.log("Stored password format:", admin.password.substring(0, 20) + "...");
  
  // Test password comparison
  const testPassword = "admin123";
  const isValid = await comparePasswords(testPassword, admin.password);
  
  console.log(`Testing password "${testPassword}" for user ${admin.username}`);
  console.log("Password valid:", isValid);
  
  // Test with a deliberately wrong password
  const wrongPassword = "wrongpassword";
  const isInvalid = await comparePasswords(wrongPassword, admin.password);
  
  console.log(`Testing password "${wrongPassword}" for user ${admin.username}`);
  console.log("Wrong password accepted:", isInvalid);
}

testAuth().catch(console.error);