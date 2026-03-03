import type { Express, Request, Response } from "express";
import { createServer, type Server } from "node:http";
import multer from "multer";
import path from "path";
import fs from "fs";
import crypto from "crypto";
import bcrypt from "bcryptjs";
import { storage } from "./storage";
import { getSql } from "./db";

// Configure multer for file uploads
const uploadDir = path.join(process.cwd(), "uploads");
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const multerStorage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, uploadDir);
  },
  filename: (_req, file, cb) => {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  },
});

const upload = multer({ storage: multerStorage });

export async function registerRoutes(app: Express): Promise<Server> {
  // Serve uploaded files
  app.use("/uploads", (req, res, next) => {
    const filePath = path.join(uploadDir, req.path);
    if (fs.existsSync(filePath)) {
      res.sendFile(filePath);
    } else {
      next();
    }
  });

  // Auth routes

  // ✅ REGISTER
  app.post("/api/auth/register", async (req: Request, res: Response) => {
    try {
      const { email, name, phone, role, password } = req.body;

      if (!email || !name || !password) {
        return res.status(400).json({ error: "email, name and password are required" });
      }

      const cleanEmail = email.trim().toLowerCase();

      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
        return res.status(400).json({ error: "Email invalide" });
      }

      if (password.length < 6) {
        return res.status(400).json({ error: "Mot de passe trop court (min 6 caractères)" });
      }

      // Check if email already exists
      const existing = await storage.getUserByEmail(cleanEmail);
      if (existing) {
        return res.status(409).json({ error: "Email déjà utilisé" });
      }

      const isAdminEmail = cleanEmail === "admin@souqlink.com";
      const effectiveRole = isAdminEmail ? "admin" : (role || "customer");

      const passwordHash = await bcrypt.hash(password, 10);

      const user = await storage.createUser({
        email: cleanEmail,
        name,
        phone: phone || null,
        role: effectiveRole,
      });

      // Update user with password hash
      await storage.updateUser(user.id, { passwordHash });

      // Don't return passwordHash to client
      const { passwordHash: _ph, ...safeUser } = user;
      res.status(201).json(safeUser);
    } catch (error) {
      console.error("Register error:", error);
      res.status(500).json({ error: "Failed to register" });
    }
  });

  // ✅ LOGIN (with password + forgot/reset password support)
  app.post("/api/auth/login", async (req: Request, res: Response) => {
    try {
      const body = req.body || {};
      const action = body.action as string | undefined;

      // --- FORGOT PASSWORD ---
      if (action === "forgot_password") {
        const email = (body.email as string)?.trim().toLowerCase();
        if (!email) return res.status(400).json({ error: "email is required" });

        const OTP_SECRET = process.env.OTP_SECRET;
        if (!OTP_SECRET) return res.status(500).json({ error: "OTP not configured" });

        const OTP_WINDOW_MIN = 10;
        const GENERIC_MSG = "Si ce compte existe, un code a été envoyé par email.";

        const user = await storage.getUserByEmail(email);
        if (!user) {
          return res.status(200).json({ message: GENERIC_MSG, expiresInMinutes: OTP_WINDOW_MIN, otp: null });
        }

        const windowIdx = Math.floor(Date.now() / (OTP_WINDOW_MIN * 60 * 1000));
        const h = crypto.createHmac("sha256", OTP_SECRET).update(`${email}|${windowIdx}`).digest("hex");
        const otp = String(parseInt(h.slice(0, 8), 16) % 1000000).padStart(6, "0");

        return res.status(200).json({ message: GENERIC_MSG, expiresInMinutes: OTP_WINDOW_MIN, otp });
      }

      // --- RESET PASSWORD ---
      if (action === "reset_password") {
        const email = (body.email as string)?.trim().toLowerCase();
        const otp = (body.otp as string)?.trim();
        const newPassword = (body.newPassword as string)?.trim();

        if (!email || !otp || !newPassword) {
          return res.status(400).json({ error: "email, otp and newPassword are required" });
        }
        if (newPassword.length < 6) {
          return res.status(400).json({ error: "Mot de passe trop court (min 6 caractères)." });
        }

        const OTP_SECRET = process.env.OTP_SECRET;
        if (!OTP_SECRET) return res.status(500).json({ error: "OTP not configured" });

        const OTP_WINDOW_MIN = 10;
        const user = await storage.getUserByEmail(email);
        if (!user) return res.status(401).json({ error: "Code invalide ou expiré." });

        const w = Math.floor(Date.now() / (OTP_WINDOW_MIN * 60 * 1000));
        const candidates = [w - 1, w, w + 1].map((idx) => {
          const h = crypto.createHmac("sha256", OTP_SECRET).update(`${email}|${idx}`).digest("hex");
          return String(parseInt(h.slice(0, 8), 16) % 1000000).padStart(6, "0");
        });

        if (!candidates.includes(otp)) {
          return res.status(401).json({ error: "Code invalide ou expiré." });
        }

        const newHash = await bcrypt.hash(newPassword, 10);
        await storage.updateUser(user.id, { passwordHash: newHash });

        return res.status(200).json({ message: "Mot de passe mis à jour avec succès." });
      }

      // --- NORMAL LOGIN ---
      const { email, password, role } = body;

      if (!email || !password) {
        return res.status(400).json({ error: "email and password are required" });
      }

      const cleanEmail = email.trim().toLowerCase();
      const user = await storage.getUserByEmail(cleanEmail);

      if (!user) {
        return res.status(401).json({ error: "Email ou mot de passe incorrect" });
      }

      if (!user.passwordHash) {
        return res.status(401).json({
          error: "Ce compte n'a pas de mot de passe. Cliquez sur « Mot de passe oublié ? ».",
        });
      }

      const ok = await bcrypt.compare(password, user.passwordHash);
      if (!ok) {
        return res.status(401).json({ error: "Email ou mot de passe incorrect" });
      }

      // Role check
      const isAdminEmail = cleanEmail === "admin@souqlink.com";
      const isAdmin = user.role === "admin";

      if (!isAdminEmail && role && !isAdmin && user.role !== role) {
        const roleNames: Record<string, string> = {
          customer: "client",
          courier: "livreur",
          admin: "administrateur",
        };
        return res.status(400).json({
          error: `Ce compte existe déjà en tant que ${roleNames[user.role] || user.role}.`,
        });
      }

      const { passwordHash: _ph, ...safeUser } = user;
      res.json(safeUser);
    } catch (error) {
      console.error("Login error:", error);
      res.status(500).json({ error: "Failed to login" });
    }
  });

  // Update user profile
  app.put("/api/users/:id", async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const { name, phone } = req.body;
      
      const updates: { name?: string; phone?: string } = {};
      if (name) updates.name = name;
      if (phone !== undefined) updates.phone = phone;
      
      const user = await storage.updateUser(id, updates);
      res.json(user);
    } catch (error) {
      console.error("Update user error:", error);
      res.status(500).json({ error: "Failed to update user" });
    }
  });

  // Get courier stats by email
  app.get("/api/couriers/stats/:email", async (req: Request, res: Response) => {
    try {
      const { email } = req.params;
      const stats = await storage.getCourierStats(email);
      res.json(stats);
    } catch (error) {
      console.error("Get courier stats error:", error);
      res.status(500).json({ error: "Failed to get courier stats" });
    }
  });

  // Products routes
  app.get("/api/products", async (_req: Request, res: Response) => {
    try {
      const products = await storage.getProducts();
      res.json(products);
    } catch (error) {
      console.error("Get products error:", error);
      res.status(500).json({ error: "Failed to get products" });
    }
  });

  app.get("/api/products/active", async (_req: Request, res: Response) => {
    try {
      const products = await storage.getActiveProducts();
      res.json(products);
    } catch (error) {
      console.error("Get active products error:", error);
      res.status(500).json({ error: "Failed to get products" });
    }
  });

  app.post("/api/products", upload.single("image"), async (req: Request, res: Response) => {
    try {
      const { name, category, indicativePrice, isActive } = req.body;
      const imageUrl = req.file ? `/uploads/${req.file.filename}` : null;

      const product = await storage.createProduct({
        name,
        category,
        indicativePrice,
        imageUrl,
        isActive: isActive === "true" || isActive === true,
      });

      res.json(product);
    } catch (error) {
      console.error("Create product error:", error);
      res.status(500).json({ error: "Failed to create product" });
    }
  });

  // PATCH /api/products?id=... (query-param style used by client)
  app.patch("/api/products", upload.single("image"), async (req: Request, res: Response) => {
    const id = req.query.id as string | undefined;
    if (!id) return res.status(400).json({ error: "Missing ?id= query parameter" });

    try {
      const { name, category, indicativePrice, isActive } = req.body;

      const updateData: any = {};
      if (name !== undefined) updateData.name = name;
      if (category !== undefined) updateData.category = category;
      if (indicativePrice !== undefined) updateData.indicativePrice = indicativePrice;
      if (isActive !== undefined) updateData.isActive = isActive === "true" || isActive === true;
      if (req.file) updateData.imageUrl = `/uploads/${req.file.filename}`;

      const product = await storage.updateProduct(id, updateData);
      if (!product) {
        return res.status(404).json({ error: "Product not found" });
      }

      res.json(product);
    } catch (error) {
      console.error("Update product error:", error);
      res.status(500).json({ error: "Failed to update product" });
    }
  });

  // PATCH /api/products/:id (RESTful path style - kept for backward compat)
  app.patch("/api/products/:id", upload.single("image"), async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const { name, category, indicativePrice, isActive } = req.body;

      const updateData: any = {};
      if (name !== undefined) updateData.name = name;
      if (category !== undefined) updateData.category = category;
      if (indicativePrice !== undefined) updateData.indicativePrice = indicativePrice;
      if (isActive !== undefined) updateData.isActive = isActive === "true" || isActive === true;
      if (req.file) updateData.imageUrl = `/uploads/${req.file.filename}`;

      const product = await storage.updateProduct(id, updateData);
      if (!product) {
        return res.status(404).json({ error: "Product not found" });
      }

      res.json(product);
    } catch (error) {
      console.error("Update product error:", error);
      res.status(500).json({ error: "Failed to update product" });
    }
  });

  // ========== Helper: parse souq list text into virtual items ==========
  function parseSouqListText(raw: string, orderId: string) {
    const text = (raw ?? "").toString().trim();
    if (!text) return [];
    const lines = text.split(/\r?\n/).map(s => s.trim()).filter(Boolean);
    return lines.map((line, idx) => {
      const m = line.match(/^(\d+(?:[.,]\d+)?)\s+(.*)$/);
      const qty = m ? parseFloat(m[1].replace(",", ".")) : 1;
      const name = (m ? m[2] : line).trim();
      return {
        id: `souq-${orderId}-${idx}`,
        productId: `souq-${idx}`,
        quantity: Number.isFinite(qty) ? qty : 1,
        indicativePrice: "0",
        product: { name: name || "Produit", imageUrl: null },
      };
    });
  }

  // ========== Orders GET dispatcher (query-param style) ==========
  app.get("/api/orders", async (req: Request, res: Response) => {
    try {
      const action = req.query.action as string | undefined;
      const id = req.query.id as string | undefined;
      const role = req.query.role as string | undefined;
      const email = req.query.email as string | undefined;

      // GET /api/orders?action=available
      if (action === "available") {
        const orders = await storage.getAvailableOrders();
        return res.json(orders);
      }

      // GET /api/orders?action=items&id=...
      if (action === "items" && id) {
        const order = await storage.getOrder(id);
        if (!order) return res.status(404).json({ error: "Order not found" });

        // Souq orders: parse souq_list_text into virtual items
        if (order.orderType === "souq") {
          const parsed = parseSouqListText(order.souqListText ?? "", id);
          return res.json(parsed);
        }

        // Supermarket orders: fetch real order items + product info
        const items = await storage.getOrderItems(id);
        const itemsWithProducts = await Promise.all(
          items.map(async (item) => {
            const product = await storage.getProduct(item.productId);
            return {
              ...item,
              product: product ? { name: product.name, imageUrl: product.imageUrl } : null,
            };
          })
        );
        return res.json(itemsWithProducts);
      }

      // GET /api/orders?action=tracking&id=...
      if (action === "tracking" && id) {
        const order = await storage.getOrder(id);
        if (!order) return res.status(404).json({ error: "Order not found" });

        return res.json({
          orderId: order.id,
          status: order.status,
          orderType: order.orderType,
          createdAt: order.createdAt,
          pickup: {
            address: order.pickupAddress ?? "Pickup",
            lat: order.pickupLat != null ? Number(order.pickupLat) : 0,
            lng: order.pickupLng != null ? Number(order.pickupLng) : 0,
          },
          dropoff: {
            address: order.deliveryAddress ?? "Dropoff",
            lat: order.dropoffLat != null ? Number(order.dropoffLat) : 0,
            lng: order.dropoffLng != null ? Number(order.dropoffLng) : 0,
          },
          courier: order.assignedCourierEmail
            ? {
                name: order.assignedCourierEmail,
                phone: null,
                lat: order.courierLat != null ? Number(order.courierLat) : null,
                lng: order.courierLng != null ? Number(order.courierLng) : null,
                lastUpdate: order.courierLastUpdate ?? null,
              }
            : null,
        });
      }

      // GET /api/orders?role=customer&email=...
      if (role === "customer" && email) {
        const orders = await storage.getOrdersByCustomerEmail(email);
        return res.json(orders);
      }

      // GET /api/orders?role=courier&email=...
      if (role === "courier" && email) {
        const orders = await storage.getOrdersByCourierEmail(email);
        return res.json(orders);
      }

      // GET /api/orders?id=...
      if (id) {
        const order = await storage.getOrder(id);
        return order ? res.json(order) : res.status(404).json({ error: "Order not found" });
      }

      // Default: GET /api/orders (all orders)
      const orders = await storage.getOrders();
      res.json(orders);
    } catch (error) {
      console.error("Get orders error:", error);
      res.status(500).json({ error: "Failed to get orders" });
    }
  });

  app.get("/api/orders/customer/:email", async (req: Request, res: Response) => {
    try {
      const { email } = req.params;
      const orders = await storage.getOrdersByCustomerEmail(email);
      res.json(orders);
    } catch (error) {
      console.error("Get customer orders error:", error);
      res.status(500).json({ error: "Failed to get orders" });
    }
  });

  app.get("/api/orders/courier/:email", async (req: Request, res: Response) => {
    try {
      const { email } = req.params;
      const orders = await storage.getOrdersByCourierEmail(email);
      res.json(orders);
    } catch (error) {
      console.error("Get courier orders error:", error);
      res.status(500).json({ error: "Failed to get orders" });
    }
  });

  app.get("/api/orders/available", async (_req: Request, res: Response) => {
    try {
      const orders = await storage.getAvailableOrders();
      res.json(orders);
    } catch (error) {
      console.error("Get available orders error:", error);
      res.status(500).json({ error: "Failed to get available orders" });
    }
  });

  app.post("/api/orders/:id/claim", async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const { courierEmail } = req.body;

      const order = await storage.getOrder(id);
      if (!order) {
        return res.status(404).json({ error: "Commande non trouvée" });
      }

      if (order.assignedCourierEmail) {
        return res.status(400).json({ error: "Cette commande a déjà été acceptée par un autre livreur" });
      }

      const updatedOrder = await storage.updateOrder(id, {
        assignedCourierEmail: courierEmail,
        status: "shopping",
      });

      res.json(updatedOrder);
    } catch (error) {
      console.error("Claim order error:", error);
      res.status(500).json({ error: "Failed to claim order" });
    }
  });

  app.get("/api/orders/:id", async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const order = await storage.getOrder(id);
      if (!order) {
        return res.status(404).json({ error: "Order not found" });
      }
      res.json(order);
    } catch (error) {
      console.error("Get order error:", error);
      res.status(500).json({ error: "Failed to get order" });
    }
  });

  app.get("/api/orders/:id/items", async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const items = await storage.getOrderItems(id);
      
      // Fetch product details for each item
      const itemsWithProducts = await Promise.all(
        items.map(async (item) => {
          const product = await storage.getProduct(item.productId);
          return {
            ...item,
            product: product ? { name: product.name, imageUrl: product.imageUrl } : null,
          };
        })
      );
      
      res.json(itemsWithProducts);
    } catch (error) {
      console.error("Get order items error:", error);
      res.status(500).json({ error: "Failed to get order items" });
    }
  });

  app.post("/api/orders", async (req: Request, res: Response) => {
    try {
      const action = req.query.action as string | undefined;
      const id = req.query.id as string | undefined;

      // POST /api/orders?action=assign&id=...  (courier claims order)
      if (action === "assign" && id) {
        const { courierEmail } = req.body;
        if (!courierEmail) return res.status(400).json({ error: "courierEmail is required" });

        const order = await storage.getOrder(id);
        if (!order) return res.status(404).json({ error: "Order not found" });

        if (order.assignedCourierEmail) {
          return res.status(409).json({ error: "Order already assigned" });
        }

        const updated = await storage.updateOrder(id, {
          assignedCourierEmail: courierEmail,
          status: "shopping",
        });
        return res.json(updated);
      }

      // POST /api/orders?action=status&id=...  (update status + optional courier coords)
      if (action === "status" && id) {
        const { status: nextStatus, courierEmail, courierLat, courierLng } = req.body;
        if (!nextStatus) return res.status(400).json({ error: "status is required" });

        const updateData: any = { status: nextStatus };
        if (courierLat != null && String(courierLat) !== "") updateData.courierLat = String(courierLat);
        if (courierLng != null && String(courierLng) !== "") updateData.courierLng = String(courierLng);

        const updated = await storage.updateOrder(id, updateData);
        if (!updated) return res.status(404).json({ error: "Order not found" });
        return res.json(updated);
      }

      // Default: POST /api/orders (create order)
      const { items, ...orderData } = req.body;

      // Validate required fields
      const { orderType, customerEmail, customerName, customerPhone, deliveryAddress } = orderData;
      if (!orderType || !customerEmail || !customerName || !customerPhone || !deliveryAddress) {
        return res.status(400).json({
          error: "Missing required fields: orderType, customerEmail, customerName, customerPhone, deliveryAddress",
          received: { orderType, customerEmail, customerName, customerPhone, deliveryAddress },
        });
      }

      // Sanitize numeric fields: empty strings / null → proper defaults or undefined
      const sanitizeDecimal = (v: any, fallback?: string): string | undefined => {
        if (v === null || v === undefined || v === "") return fallback;
        return String(v);
      };

      // Clean orderData numeric fields before insert
      const cleanOrder: any = { ...orderData };
      cleanOrder.status = "received";
      cleanOrder.deliveryFee = sanitizeDecimal(orderData.deliveryFee, "15.00");
      cleanOrder.finalTotal = sanitizeDecimal(orderData.finalTotal);
      cleanOrder.budgetMax = sanitizeDecimal(orderData.budgetMax);

      const order = await storage.createOrder(cleanOrder);

      // Create order items if this is a supermarket order
      if (items && items.length > 0) {
        const orderItems = items.map((item: any) => ({
          orderId: order.id,
          productId: item.productId,
          quantity: item.quantity || 1,
          indicativePrice: sanitizeDecimal(item.indicativePrice, "0.00")!,
        }));
        await storage.createOrderItems(orderItems);
      }

      res.json(order);
    } catch (error: any) {
      console.error("Create order error:", error);
      console.error("Request body was:", JSON.stringify(req.body));
      res.status(500).json({ error: "Failed to create order", details: error?.message });
    }
  });

  app.patch("/api/orders/:id", async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const updateData = req.body;

      const order = await storage.updateOrder(id, updateData);
      if (!order) {
        return res.status(404).json({ error: "Order not found" });
      }

      res.json(order);
    } catch (error) {
      console.error("Update order error:", error);
      res.status(500).json({ error: "Failed to update order" });
    }
  });

  app.delete("/api/orders/:id", async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const deleted = await storage.deleteOrder(id);
      if (!deleted) {
        return res.status(404).json({ error: "Order not found" });
      }
      res.json({ success: true });
    } catch (error) {
      console.error("Delete order error:", error);
      res.status(500).json({ error: "Failed to delete order" });
    }
  });

  // Couriers route
  app.get("/api/couriers", async (_req: Request, res: Response) => {
    try {
      const couriers = await storage.getAllCouriers();
      res.json(couriers);
    } catch (error) {
      console.error("Get couriers error:", error);
      res.status(500).json({ error: "Failed to get couriers" });
    }
  });

  // Update courier location
  app.post("/api/orders/:id/courier-location", async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const { lat, lng } = req.body;

      if (lat === undefined || lng === undefined) {
        return res.status(400).json({ error: "Latitude and longitude are required" });
      }

      const order = await storage.updateOrder(id, {
        courierLat: lat.toString(),
        courierLng: lng.toString(),
        courierLastUpdate: new Date(),
      });

      if (!order) {
        return res.status(404).json({ error: "Order not found" });
      }

      res.json({ success: true, order });
    } catch (error) {
      console.error("Update courier location error:", error);
      res.status(500).json({ error: "Failed to update courier location" });
    }
  });
  
  // Get order tracking data (includes courier location)
  app.get("/api/orders?action=tracking&id=${encodeURIComponent(orderId)}", async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const order = await storage.getOrder(id);

      if (!order) {
        return res.status(404).json({ error: "Order not found" });
      }

      // Get courier info if assigned
      let courier = null;
      if (order.assignedCourierEmail) {
        courier = await storage.getUserByEmail(order.assignedCourierEmail);
      }

      res.json({
        orderId: order.id,
        status: order.status,
        pickup: {
          address: order.pickupAddress || "Supermarché local",
          lat: order.pickupLat ? parseFloat(order.pickupLat) : 33.5731,
          lng: order.pickupLng ? parseFloat(order.pickupLng) : -7.5898,
        },
        dropoff: {
          address: order.deliveryAddress,
          lat: order.dropoffLat ? parseFloat(order.dropoffLat) : 33.5831,
          lng: order.dropoffLng ? parseFloat(order.dropoffLng) : -7.5998,
        },
        courier: order.assignedCourierEmail ? {
          name: courier?.name || "Livreur",
          phone: courier?.phone || null,
          lat: order.courierLat ? parseFloat(order.courierLat) : null,
          lng: order.courierLng ? parseFloat(order.courierLng) : null,
          lastUpdate: order.courierLastUpdate,
        } : null,
        orderType: order.orderType,
        createdAt: order.createdAt,
      });
    } catch (error) {
      console.error("Get tracking error:", error);
      res.status(500).json({ error: "Failed to get tracking data" });
    }
  });

  // Admin stats route
  app.get("/api/admin/stats", async (_req: Request, res: Response) => {
    try {
      const orders = await storage.getOrders();
      
      const totalOrders = orders.length;
      const supermarketOrders = orders.filter(o => o.orderType === "supermarket").length;
      const souqOrders = orders.filter(o => o.orderType === "souq").length;
      
      const ordersByStatus: Record<string, number> = {
        received: 0,
        shopping: 0,
        in_delivery: 0,
        delivered: 0,
      };
      
      orders.forEach(order => {
        if (ordersByStatus[order.status] !== undefined) {
          ordersByStatus[order.status]++;
        }
      });

      res.json({
        totalOrders,
        supermarketOrders,
        souqOrders,
        ordersByStatus,
      });
    } catch (error) {
      console.error("Get admin stats error:", error);
      res.status(500).json({ error: "Failed to get stats" });
    }
  });

  const httpServer = createServer(app);

  return httpServer;
}
