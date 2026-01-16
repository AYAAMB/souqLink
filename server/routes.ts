import type { Express, Request, Response } from "express";
import { createServer, type Server } from "node:http";
import multer from "multer";
import path from "path";
import fs from "fs";
import { storage } from "./storage";

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
  app.post("/api/auth/login", async (req: Request, res: Response) => {
    try {
      const { email, name, phone, role } = req.body;

      if (!email || !name) {
        return res.status(400).json({ error: "Email and name are required" });
      }

      // Check if user exists
      let user = await storage.getUserByEmail(email);

      if (!user) {
        // Create new user
        user = await storage.createUser({
          email,
          name,
          phone: phone || null,
          role: role || "customer",
        });
      } else if (role && user.role !== role && user.role !== "admin") {
        // If existing user has different role, show error
        const roleNames: Record<string, string> = {
          customer: "client",
          courier: "livreur",
          admin: "administrateur"
        };
        return res.status(400).json({ 
          error: `Ce compte existe déjà en tant que ${roleNames[user.role] || user.role}. Utilisez un autre email ou connectez-vous avec le bon rôle.`
        });
      }

      res.json(user);
    } catch (error) {
      console.error("Login error:", error);
      res.status(500).json({ error: "Failed to login" });
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

  // Orders routes
  app.get("/api/orders", async (_req: Request, res: Response) => {
    try {
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
      const { items, ...orderData } = req.body;

      const order = await storage.createOrder({
        ...orderData,
        status: "received",
        deliveryFee: "15.00",
      });

      // Create order items if this is a supermarket order
      if (items && items.length > 0) {
        const orderItems = items.map((item: any) => ({
          orderId: order.id,
          productId: item.productId,
          quantity: item.quantity,
          indicativePrice: item.indicativePrice,
        }));
        await storage.createOrderItems(orderItems);
      }

      res.json(order);
    } catch (error) {
      console.error("Create order error:", error);
      res.status(500).json({ error: "Failed to create order" });
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
  app.get("/api/orders/:id/tracking", async (req: Request, res: Response) => {
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
