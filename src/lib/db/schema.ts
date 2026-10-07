// Mirrors supabase/migrations/*.sql — the SQL migrations are the source of truth.
import {
  bigint,
  boolean,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";

export const productType = pgEnum("product_type", ["thrift", "merch"]);
export const productStatus = pgEnum("product_status", ["draft", "active", "archived"]);
export const orderStatus = pgEnum("order_status", [
  "awaiting_quote",
  "awaiting_payment",
  "payment_review",
  "paid",
  "processing",
  "shipped",
  "completed",
  "cancelled",
  "expired",
]);
export const stockMovementType = pgEnum("stock_movement_type", [
  "restock",
  "adjust",
  "reserve",
  "release",
  "sale",
  "return",
]);
export const staffRole = pgEnum("staff_role", ["owner", "staff"]);
export const proofStatus = pgEnum("proof_status", ["pending", "approved", "rejected"]);

const ts = (name: string) => timestamp(name, { withTimezone: true, mode: "date" });

export const categories = pgTable("categories", {
  id: uuid("id").primaryKey().defaultRandom(),
  slug: text("slug").notNull().unique(),
  nameId: text("name_id").notNull(),
  nameEn: text("name_en").notNull(),
  sort: integer("sort").notNull().default(0),
});

export type Measurements = Partial<Record<string, number>>;

export const products = pgTable("products", {
  id: uuid("id").primaryKey().defaultRandom(),
  slug: text("slug").notNull().unique(),
  type: productType("type").notNull(),
  categoryId: uuid("category_id").notNull().references(() => categories.id),
  nameId: text("name_id").notNull(),
  nameEn: text("name_en").notNull(),
  descriptionId: text("description_id").notNull().default(""),
  descriptionEn: text("description_en").notNull().default(""),
  price: integer("price").notNull(),
  compareAtPrice: integer("compare_at_price"),
  conditionScore: integer("condition_score"),
  conditionNoteId: text("condition_note_id").notNull().default(""),
  conditionNoteEn: text("condition_note_en").notNull().default(""),
  measurements: jsonb("measurements").$type<Measurements>().notNull().default({}),
  status: productStatus("status").notNull().default("draft"),
  featured: boolean("featured").notNull().default(false),
  createdAt: ts("created_at").notNull().defaultNow(),
  updatedAt: ts("updated_at").notNull().defaultNow(),
});

export const productImages = pgTable("product_images", {
  id: uuid("id").primaryKey().defaultRandom(),
  productId: uuid("product_id").notNull().references(() => products.id, { onDelete: "cascade" }),
  url: text("url").notNull(),
  alt: text("alt").notNull().default(""),
  sort: integer("sort").notNull().default(0),
});

export const variants = pgTable("variants", {
  id: uuid("id").primaryKey().defaultRandom(),
  productId: uuid("product_id").notNull().references(() => products.id, { onDelete: "cascade" }),
  sizeLabel: text("size_label").notNull(),
  sku: text("sku").unique(),
  sort: integer("sort").notNull().default(0),
  stockOnHand: integer("stock_on_hand").notNull().default(0),
  reserved: integer("reserved").notNull().default(0),
});

export const staff = pgTable("staff", {
  userId: uuid("user_id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  role: staffRole("role").notNull().default("staff"),
  active: boolean("active").notNull().default(true),
  createdAt: ts("created_at").notNull().defaultNow(),
});

export type Address = {
  line: string;
  district: string;
  city: string;
  province: string;
  postalCode: string;
};

export const orders = pgTable("orders", {
  id: uuid("id").primaryKey().defaultRandom(),
  code: text("code").notNull().unique(),
  accessTokenHash: text("access_token_hash").notNull(),
  status: orderStatus("status").notNull().default("awaiting_quote"),
  locale: text("locale").notNull().default("id"),
  customerName: text("customer_name").notNull(),
  email: text("email").notNull(),
  phone: text("phone").notNull(),
  address: jsonb("address").$type<Address>().notNull(),
  note: text("note").notNull().default(""),
  subtotal: integer("subtotal").notNull(),
  shippingCost: integer("shipping_cost"),
  courier: text("courier"),
  uniqueCode: integer("unique_code"),
  total: integer("total"),
  quoteDeadline: ts("quote_deadline").notNull(),
  shippingQuotedAt: ts("shipping_quoted_at"),
  paymentDeadline: ts("payment_deadline"),
  paidAt: ts("paid_at"),
  trackingNumber: text("tracking_number"),
  shippedAt: ts("shipped_at"),
  completedAt: ts("completed_at"),
  cancelledAt: ts("cancelled_at"),
  cancelReason: text("cancel_reason"),
  internalNote: text("internal_note").notNull().default(""),
  customerId: uuid("customer_id"),
  claimedBy: uuid("claimed_by"),
  assigneeId: uuid("assignee_id"),
  createdAt: ts("created_at").notNull().defaultNow(),
  updatedAt: ts("updated_at").notNull().defaultNow(),
});

export const orderItems = pgTable("order_items", {
  id: uuid("id").primaryKey().defaultRandom(),
  orderId: uuid("order_id").notNull().references(() => orders.id, { onDelete: "cascade" }),
  variantId: uuid("variant_id").notNull().references(() => variants.id),
  productId: uuid("product_id").notNull().references(() => products.id),
  productName: text("product_name").notNull(),
  sizeLabel: text("size_label").notNull(),
  imageUrl: text("image_url"),
  unitPrice: integer("unit_price").notNull(),
  qty: integer("qty").notNull(),
});

export const paymentProofs = pgTable("payment_proofs", {
  id: uuid("id").primaryKey().defaultRandom(),
  orderId: uuid("order_id").notNull().references(() => orders.id, { onDelete: "cascade" }),
  storagePath: text("storage_path").notNull(),
  status: proofStatus("status").notNull().default("pending"),
  reviewNote: text("review_note"),
  reviewedBy: uuid("reviewed_by").references(() => staff.userId),
  reviewedAt: ts("reviewed_at"),
  createdAt: ts("created_at").notNull().defaultNow(),
});

export const orderEvents = pgTable("order_events", {
  id: bigint("id", { mode: "number" }).primaryKey().generatedAlwaysAsIdentity(),
  orderId: uuid("order_id").notNull().references(() => orders.id, { onDelete: "cascade" }),
  status: orderStatus("status"),
  message: text("message").notNull(),
  actorId: uuid("actor_id").references(() => staff.userId),
  createdAt: ts("created_at").notNull().defaultNow(),
});

export const stockMovements = pgTable("stock_movements", {
  id: bigint("id", { mode: "number" }).primaryKey().generatedAlwaysAsIdentity(),
  variantId: uuid("variant_id").notNull().references(() => variants.id, { onDelete: "cascade" }),
  type: stockMovementType("type").notNull(),
  qty: integer("qty").notNull(),
  orderId: uuid("order_id").references(() => orders.id, { onDelete: "set null" }),
  actorId: uuid("actor_id").references(() => staff.userId),
  note: text("note").notNull().default(""),
  createdAt: ts("created_at").notNull().defaultNow(),
});

export const settings = pgTable("settings", {
  key: text("key").primaryKey(),
  value: jsonb("value").notNull(),
  updatedAt: ts("updated_at").notNull().defaultNow(),
});

export const contactMessages = pgTable("contact_messages", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  email: text("email").notNull(),
  phone: text("phone").notNull().default(""),
  message: text("message").notNull(),
  handled: boolean("handled").notNull().default(false),
  createdAt: ts("created_at").notNull().defaultNow(),
});

export const auditLogs = pgTable("audit_logs", {
  id: bigint("id", { mode: "number" }).primaryKey().generatedAlwaysAsIdentity(),
  actorId: uuid("actor_id").references(() => staff.userId),
  action: text("action").notNull(),
  entity: text("entity").notNull(),
  entityId: text("entity_id"),
  data: jsonb("data").notNull().default({}),
  createdAt: ts("created_at").notNull().defaultNow(),
});

export const notificationsLog = pgTable("notifications_log", {
  id: bigint("id", { mode: "number" }).primaryKey().generatedAlwaysAsIdentity(),
  orderId: uuid("order_id").references(() => orders.id, { onDelete: "cascade" }),
  channel: text("channel").notNull(),
  event: text("event").notNull(),
  recipient: text("recipient").notNull(),
  status: text("status").notNull(),
  error: text("error"),
  createdAt: ts("created_at").notNull().defaultNow(),
});

export const rateLimits = pgTable("rate_limits", {
  key: text("key").primaryKey(),
  windowStart: ts("window_start").notNull(),
  count: integer("count").notNull(),
});

export type OrderStatus = (typeof orderStatus.enumValues)[number];
export type Product = typeof products.$inferSelect;
export type Variant = typeof variants.$inferSelect;
export type Order = typeof orders.$inferSelect;

// ---------------------------------------------------------------- accounts & fulfillment
// (supabase/migrations/20261008000000_accounts_fulfillment.sql)

export const customers = pgTable("customers", {
  userId: uuid("user_id").primaryKey(),
  name: text("name").notNull(),
  phone: text("phone").notNull().default(""),
  createdAt: ts("created_at").notNull().defaultNow(),
  updatedAt: ts("updated_at").notNull().defaultNow(),
});

export const customerAddresses = pgTable("customer_addresses", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").notNull().references(() => customers.userId, { onDelete: "cascade" }),
  label: text("label").notNull().default(""),
  recipient: text("recipient").notNull(),
  phone: text("phone").notNull(),
  line: text("line").notNull(),
  district: text("district").notNull(),
  city: text("city").notNull(),
  province: text("province").notNull(),
  postalCode: text("postal_code").notNull(),
  isDefault: boolean("is_default").notNull().default(false),
  createdAt: ts("created_at").notNull().defaultNow(),
});

export const fulfillmentStage = pgEnum("fulfillment_stage", ["packing", "shipping"]);

export const fulfillmentSteps = pgTable("fulfillment_steps", {
  id: uuid("id").primaryKey().defaultRandom(),
  orderId: uuid("order_id").notNull().references(() => orders.id, { onDelete: "cascade" }),
  stage: fulfillmentStage("stage").notNull(),
  actorId: uuid("actor_id").notNull().references(() => staff.userId),
  tookOverFrom: uuid("took_over_from").references(() => staff.userId),
  photos: text("photos").array().notNull().default([]),
  note: text("note").notNull().default(""),
  createdAt: ts("created_at").notNull().defaultNow(),
});

export type CustomerAddress = typeof customerAddresses.$inferSelect;
export type FulfillmentStep = typeof fulfillmentSteps.$inferSelect;
