import { 
  users, type User, type InsertUser,
  products, type Product, type InsertProduct,
  orders, type Order, type InsertOrder,
  orderItems, type OrderItem, type InsertOrderItem 
} from "@shared/schema";
import { db } from "./db";
import { eq, desc, and, isNull } from "drizzle-orm";

export interface IStorage {
  // Users
  getUser(id: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  getAllCouriers(): Promise<User[]>;

  // Products
  getProducts(): Promise<Product[]>;
  getActiveProducts(): Promise<Product[]>;
  getProduct(id: string): Promise<Product | undefined>;
  createProduct(product: InsertProduct): Promise<Product>;
  updateProduct(id: string, product: Partial<InsertProduct>): Promise<Product | undefined>;

  // Orders
  getOrders(): Promise<Order[]>;
  getOrder(id: string): Promise<Order | undefined>;
  getOrdersByCustomerEmail(email: string): Promise<Order[]>;
  getOrdersByCourierEmail(email: string): Promise<Order[]>;
  getAvailableOrders(): Promise<Order[]>;
  createOrder(order: InsertOrder): Promise<Order>;
  updateOrder(id: string, order: Partial<InsertOrder>): Promise<Order | undefined>;

  // Order Items
  getOrderItems(orderId: string): Promise<OrderItem[]>;
  createOrderItem(item: InsertOrderItem): Promise<OrderItem>;
  createOrderItems(items: InsertOrderItem[]): Promise<OrderItem[]>;
}

export class DatabaseStorage implements IStorage {
  // Users
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user || undefined;
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.email, email));
    return user || undefined;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const [user] = await db.insert(users).values(insertUser).returning();
    return user;
  }

  async updateUser(id: string, updates: Partial<InsertUser>): Promise<User> {
    const [user] = await db.update(users).set(updates).where(eq(users.id, id)).returning();
    return user;
  }

  async getAllCouriers(): Promise<User[]> {
    return db.select().from(users).where(eq(users.role, "courier"));
  }

  // Products
  async getProducts(): Promise<Product[]> {
    return db.select().from(products).orderBy(desc(products.createdAt));
  }

  async getActiveProducts(): Promise<Product[]> {
    return db.select().from(products).where(eq(products.isActive, true)).orderBy(products.name);
  }

  async getProduct(id: string): Promise<Product | undefined> {
    const [product] = await db.select().from(products).where(eq(products.id, id));
    return product || undefined;
  }

  async createProduct(insertProduct: InsertProduct): Promise<Product> {
    const [product] = await db.insert(products).values(insertProduct).returning();
    return product;
  }

  async updateProduct(id: string, updateData: Partial<InsertProduct>): Promise<Product | undefined> {
    const [product] = await db
      .update(products)
      .set(updateData)
      .where(eq(products.id, id))
      .returning();
    return product || undefined;
  }

  // Orders
  async getOrders(): Promise<Order[]> {
    return db.select().from(orders).orderBy(desc(orders.createdAt));
  }

  async getOrder(id: string): Promise<Order | undefined> {
    const [order] = await db.select().from(orders).where(eq(orders.id, id));
    return order || undefined;
  }

  async getOrdersByCustomerEmail(email: string): Promise<Order[]> {
    return db
      .select()
      .from(orders)
      .where(eq(orders.customerEmail, email))
      .orderBy(desc(orders.createdAt));
  }

  async getOrdersByCourierEmail(email: string): Promise<Order[]> {
    return db
      .select()
      .from(orders)
      .where(eq(orders.assignedCourierEmail, email))
      .orderBy(desc(orders.createdAt));
  }

  async getAvailableOrders(): Promise<Order[]> {
    return db
      .select()
      .from(orders)
      .where(
        and(
          eq(orders.status, "received"),
          isNull(orders.assignedCourierEmail)
        )
      )
      .orderBy(desc(orders.createdAt));
  }

  async createOrder(insertOrder: InsertOrder): Promise<Order> {
    const [order] = await db.insert(orders).values(insertOrder).returning();
    return order;
  }

  async updateOrder(id: string, updateData: Partial<InsertOrder>): Promise<Order | undefined> {
    const [order] = await db
      .update(orders)
      .set(updateData)
      .where(eq(orders.id, id))
      .returning();
    return order || undefined;
  }

  // Order Items
  async getOrderItems(orderId: string): Promise<OrderItem[]> {
    return db.select().from(orderItems).where(eq(orderItems.orderId, orderId));
  }

  async createOrderItem(insertItem: InsertOrderItem): Promise<OrderItem> {
    const [item] = await db.insert(orderItems).values(insertItem).returning();
    return item;
  }

  async createOrderItems(items: InsertOrderItem[]): Promise<OrderItem[]> {
    if (items.length === 0) return [];
    return db.insert(orderItems).values(items).returning();
  }
}

export const storage = new DatabaseStorage();
