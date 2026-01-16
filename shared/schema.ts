import { sql, relations } from "drizzle-orm";
import { pgTable, text, varchar, integer, boolean, timestamp, decimal } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Users table with role-based access
export const users = pgTable("users", {
  id: varchar("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  email: text("email").notNull().unique(),
  name: text("name").notNull(),
  phone: text("phone"),
  role: text("role").notNull().default("customer"), // admin | courier | customer
  createdAt: timestamp("created_at").defaultNow(),
});

// Products table (supermarket only)
export const products = pgTable("products", {
  id: varchar("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  category: text("category").notNull(), // fruits_vegetables, dairy, grocery, drinks, cleaning
  imageUrl: text("image_url"),
  indicativePrice: decimal("indicative_price", { precision: 10, scale: 2 }).notNull(),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").defaultNow(),
});

// Orders table
export const orders = pgTable("orders", {
  id: varchar("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  orderType: text("order_type").notNull(), // supermarket | souq
  customerEmail: text("customer_email").notNull(),
  customerName: text("customer_name").notNull(),
  customerPhone: text("customer_phone").notNull(),
  deliveryAddress: text("delivery_address").notNull(),
  status: text("status").notNull().default("received"), // received | shopping | in_delivery | delivered
  assignedCourierEmail: text("assigned_courier_email"),
  deliveryFee: decimal("delivery_fee", { precision: 10, scale: 2 }).notNull().default("15.00"),
  finalTotal: decimal("final_total", { precision: 10, scale: 2 }),
  notes: text("notes"),
  // Souq-specific fields
  souqListText: text("souq_list_text"),
  qualityPreference: text("quality_preference"), // standard | best_quality
  budgetEnabled: boolean("budget_enabled").default(false),
  budgetMax: decimal("budget_max", { precision: 10, scale: 2 }),
  preferredTimeWindow: text("preferred_time_window"), // morning | afternoon | evening
  createdAt: timestamp("created_at").defaultNow(),
});

// Order Items table (supermarket only)
export const orderItems = pgTable("order_items", {
  id: varchar("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  orderId: varchar("order_id").notNull().references(() => orders.id),
  productId: varchar("product_id").notNull().references(() => products.id),
  quantity: integer("quantity").notNull(),
  indicativePrice: decimal("indicative_price", { precision: 10, scale: 2 }).notNull(),
});

// Relations
export const usersRelations = relations(users, ({ many }) => ({
  ordersAsCustomer: many(orders),
}));

export const ordersRelations = relations(orders, ({ many }) => ({
  items: many(orderItems),
}));

export const orderItemsRelations = relations(orderItems, ({ one }) => ({
  order: one(orders, {
    fields: [orderItems.orderId],
    references: [orders.id],
  }),
  product: one(products, {
    fields: [orderItems.productId],
    references: [products.id],
  }),
}));

// Insert schemas
export const insertUserSchema = createInsertSchema(users).pick({
  email: true,
  name: true,
  phone: true,
  role: true,
});

export const insertProductSchema = createInsertSchema(products).pick({
  name: true,
  category: true,
  imageUrl: true,
  indicativePrice: true,
  isActive: true,
});

export const insertOrderSchema = createInsertSchema(orders).omit({
  id: true,
  createdAt: true,
});

export const insertOrderItemSchema = createInsertSchema(orderItems).pick({
  orderId: true,
  productId: true,
  quantity: true,
  indicativePrice: true,
});

// Types
export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;
export type InsertProduct = z.infer<typeof insertProductSchema>;
export type Product = typeof products.$inferSelect;
export type InsertOrder = z.infer<typeof insertOrderSchema>;
export type Order = typeof orders.$inferSelect;
export type InsertOrderItem = z.infer<typeof insertOrderItemSchema>;
export type OrderItem = typeof orderItems.$inferSelect;
