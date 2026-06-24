# 🚀 PakMove - Full-Stack Logistic & Moving Platform

PakMove is a modern full-stack web application designed to streamline moving, logistics, and shifting services. It features a completely decoupled architecture, separating a clean Vanilla JS frontend from a powerful Node.js/Express RESTful API backend, with data securely stored in MongoDB Atlas cloud.

---

## 🌐 Live Demo & Preview

You can experience the live application here:  
👉 **[Launch PakMove Live Project](https://pakmove-project.vercel.app/)**

---
## 💻 Tech Stack & Architecture

| Layer | Technologies Used |
| :--- | :--- |
| **Frontend** | Vanilla JavaScript (ES6+), HTML5, CSS3 (Custom Theme Variables) |
| **Backend** | Node.js, Express.js |
| **Database** | MongoDB Atlas (Cloud Database) |
| **Server Tool** | VS Code Live Server (Frontend Hosting) |

---

## 🌟 Key Features & Core Modules

### 1. 🔐 Multi-Role Authentication & Access
- Secure User Signup, Login, and Authorization system.
- Direct integration with MongoDB Atlas to store customer profiles.
- Role-based management supporting **Customers**, **Drivers**, and **Admins** (roles editable securely via DB).

### 2. 📊 Interactive Centralized Dashboards
- **Customer Workspace:** Allows clients to easily create, estimate fares based on item weight/vehicle tier, and track active deliveries.
- **Admin Control Panel:** Dedicated dashboard layout accessible via admin privileges to overview system stats and data entries.

### 3. 📦 Shipment Management
- Live calculation of delivery fares based on package category and destination parameters.
- Order placement system directly hooked into the Express backend API endpoints.

---

## 📂 Real Project Structure

The project code is meticulously organized into a root-level frontend workflow and a dedicated backend server:

```text
PakMove/
├── backend/                  # Node.js/Express RESTful API
│   ├── config/               # Server and Database Configurations
│   ├── controllers/          # Business Logic (AuthController, OrderController)
│   ├── middleware/           # Security & Token Verification Guards
│   ├── models/               # MongoDB Mongoose Schemas (User, Order)
│   ├── routes/               # REST Endpoints (authRoutes, orderRoutes)
│   ├── .env                  # Environment Variables (Database Connection Strings)
│   └── server.js             # Express Server Initialization Entry Point
├── app.js                    # Core Root-Level Frontend Logic (API Handlers)
├── index.html                # Premium UI Main Dashboard & Landing Page
├── styles.css                # Custom Layouts & UI Theme Styling
└── frontend/                 # React/Modular Architecture Workspace 
    └── src/
        └── services/
            └── api.js        # API Base Config & Authentication Services
