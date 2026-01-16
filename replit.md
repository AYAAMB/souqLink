# SouqLink - Local Grocery Delivery App

## Overview
SouqLink is a local grocery delivery mobile application built with Expo React Native and Express.js backend. It allows customers to order groceries from supermarkets using a catalog-style interface or place free-text orders for traditional souq (market) items.

## Core Concept
- **Supermarkets** are passive suppliers (no login, no profile)
- **SouqLink** manually manages the supermarket catalog
- **Souq orders** have NO catalog (free-text shopping list)
- All orders are fulfilled by **student couriers**
- **Cash on delivery** only
- MVP-focused: simple, functional, real-world usable

## User Roles

### Customer (default role)
- Browse supermarket products by category
- Add products to cart and checkout
- Place free-text souq orders with preferences
- Track order status in real-time
- View order history

### Courier
- View assigned deliveries
- Accept and manage delivery status
- Update order status: received → shopping → in_delivery → delivered

### Admin
- Manage product catalog (add/edit/deactivate with image upload)
- View all orders with filters
- Assign couriers to orders
- Update final order totals
- View dashboard statistics

## Pre-configured Accounts
- Admin: admin@souqlink.com (pre-seeded in database)
- New customers and couriers can register through the app

## Technical Stack

### Frontend
- Expo SDK 54 with React Native
- React Navigation 7 for role-based navigation
- TanStack Query for data fetching with real-time sync
- AsyncStorage for session persistence

### Backend
- Express.js REST API
- PostgreSQL database with Drizzle ORM
- Multer for image uploads

### Database Schema
- **users**: id, email, name, phone, role
- **products**: id, name, category, image_url, indicative_price, is_active
- **orders**: id, order_type, customer info, status, courier assignment, souq fields
- **order_items**: id, order_id, product_id, quantity, indicative_price

## API Endpoints

### Auth
- POST /api/auth/login - Login/register user

### Products
- GET /api/products - All products (admin)
- GET /api/products/active - Active products only
- POST /api/products - Create product (with image)
- PATCH /api/products/:id - Update product

### Orders
- GET /api/orders - All orders (admin)
- GET /api/orders/customer/:email - Customer's orders
- GET /api/orders/courier/:email - Courier's assigned orders
- POST /api/orders - Create order
- PATCH /api/orders/:id - Update order
- GET /api/orders/:id/items - Get order items

### Admin
- GET /api/couriers - All courier accounts
- GET /api/admin/stats - Dashboard statistics

## Product Categories
- Fruits & Vegetables
- Dairy
- Grocery
- Drinks
- Cleaning

## Order Statuses
- **received**: Order placed, waiting for assignment
- **shopping**: Courier is shopping for items
- **in_delivery**: Courier is delivering
- **delivered**: Order completed

## Workflows
- **Start Backend**: Express server on port 5000
- **Start Frontend**: Expo dev server on port 8081

## Design
- Brand colors: Emerald green (primary), Coral orange (accent)
- Mobile-first, iOS-inspired design
- Glass effect navigation bars
- Real-time order synchronization (5-second polling)
