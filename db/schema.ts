import { index, integer, sqliteTable, text } from "drizzle-orm/sqlite-core";

export const machines = sqliteTable("machines", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  name: text("name").notNull(),
  spec: text("spec").notNull(),
  status: text("status").notNull().default("available"),
});

export const users = sqliteTable("users", {
  userId: text("user_id").primaryKey(),
  displayName: text("display_name").notNull(),
  updatedAt: text("updated_at").notNull(),
});

export const bookings = sqliteTable("bookings", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  machineId: integer("machine_id").notNull(),
  userId: text("user_id").notNull(),
  userName: text("user_name").notNull(),
  usageType: text("usage_type").notNull(),
  title: text("title").notNull(),
  startAt: text("start_at").notNull(),
  endAt: text("end_at").notNull(),
  note: text("note").notNull().default(""),
  createdAt: text("created_at").notNull(),
}, (table) => [index("bookings_machine_time_idx").on(table.machineId, table.startAt, table.endAt)]);
