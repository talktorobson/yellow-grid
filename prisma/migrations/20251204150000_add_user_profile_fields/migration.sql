-- Migration: Add user profile fields (avatar_url, avatar_thumbnail_url, preferred_language)
-- This migration adds optional profile fields to the users table

-- Add avatar URL for user profile pictures
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "avatar_url" TEXT;

-- Add avatar thumbnail URL for optimized display
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "avatar_thumbnail_url" TEXT;

-- Add preferred language setting (e.g., 'en', 'fr', 'es', 'it', 'pt')
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "preferred_language" VARCHAR(5);
