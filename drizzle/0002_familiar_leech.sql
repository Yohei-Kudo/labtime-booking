-- Privacy migration: existing profiles and bookings contain plaintext email
-- addresses that cannot be converted to keyed HMAC IDs inside SQLite.
-- Confirm the production database is unused or export needed records before
-- applying this migration. Machines are preserved.
DROP TABLE `bookings`;--> statement-breakpoint
DROP TABLE `users`;--> statement-breakpoint
CREATE TABLE `bookings` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`machine_id` integer NOT NULL,
	`user_id` text NOT NULL,
	`user_name` text NOT NULL,
	`usage_type` text NOT NULL,
	`title` text NOT NULL,
	`start_at` text NOT NULL,
	`end_at` text NOT NULL,
	`note` text DEFAULT '' NOT NULL,
	`created_at` text NOT NULL
);--> statement-breakpoint
CREATE TABLE `users` (
	`user_id` text PRIMARY KEY NOT NULL,
	`display_name` text NOT NULL,
	`updated_at` text NOT NULL
);
