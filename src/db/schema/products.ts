import { sqliteTable, text, integer, real } from "drizzle-orm/sqlite-core";
import { sql } from "drizzle-orm";
// ===========================================
// PRODUCTS TABLE
// ===========================================
export const products = sqliteTable("products", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  slug: text("slug").notNull().unique(),
  description: text("description"),
  price: real("price").notNull(),
  compareAtPrice: real("compare_at_price"),
  currency: text("currency").notNull().default("MXN"),
  category: text("category", {
    enum: ["music", "clothing", "accessories", "merchandise"]
  }).notNull().default("merchandise"),
  imageUrl: text("image_url"),
  images: text("images", { mode: "json" }).$type<string[]>().default([]),
  stripeProductId: text("stripe_product_id"),
  stripePriceId: text("stripe_price_id"),
  isDigital: integer("is_digital", { mode: "boolean" }).notNull().default(false),
  isActive: integer("is_active", { mode: "boolean" }).notNull().default(true),
  isFeatured: integer("is_featured", { mode: "boolean" }).notNull().default(false),
  stockQuantity: integer("stock_quantity"),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull().default(sql`(unixepoch())`),
  updatedAt: integer("updated_at", { mode: "timestamp" }).notNull().default(sql`(unixepoch())`),
});
// ===========================================
// ORDERS TABLE
// ===========================================
export const orders = sqliteTable("orders", {
  id: text("id").primaryKey(),
  orderNumber: text("order_number").notNull().unique(),
  customerEmail: text("customer_email").notNull(),
  customerName: text("customer_name"),
  status: text("status", {
    enum: ["pending", "paid", "shipped", "delivered", "cancelled", "refunded"]
  }).notNull().default("pending"),
  subtotal: real("subtotal").notNull(),
  tax: real("tax").notNull().default(0),
  shipping: real("shipping").notNull().default(0),
  total: real("total").notNull(),
  currency: text("currency").notNull().default("MXN"),
  stripeSessionId: text("stripe_session_id"),
  stripePaymentIntentId: text("stripe_payment_intent_id"),
  shippingAddress: text("shipping_address"),
  notes: text("notes"),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull().default(sql`(unixepoch())`),
  updatedAt: integer("updated_at", { mode: "timestamp" }).notNull().default(sql`(unixepoch())`),
});
// ===========================================
// ORDER ITEMS TABLE
// ===========================================
export const orderItems = sqliteTable("order_items", {
  id: text("id").primaryKey(),
  orderId: text("order_id").notNull().references(() => orders.id, { onDelete: "cascade" }),
  productId: text("product_id").notNull().references(() => products.id, { onDelete: "restrict" }),
  quantity: integer("quantity").notNull(),
  unitPrice: real("unit_price").notNull(),
  total: real("total").notNull(),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull().default(sql`(unixepoch())`),
});
// TYPE EXPORTS
export type Product = typeof products.$inferSelect;
export type NewProduct = typeof products.$inferInsert;
export type Order = typeof orders.$inferSelect;
export type NewOrder = typeof orders.$inferInsert;
export type OrderItem = typeof orderItems.$inferSelect;
export type NewOrderItem = typeof orderItems.$inferInsert;
