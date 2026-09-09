/**
 * Environment configuration for the NestJS API app.
 * 
 * AUTH_SECRET must match the value in apps/web/.env.local
 */
export const AUTH_SECRET = process.env.AUTH_SECRET || "your-32-plus-character-secret-key-here";