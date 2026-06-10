# Dorado POS System

This is the Dorado Point of Sale (POS) and Admin Management system. The project is split into a separated backend (Node.js/Express) and frontend (React/Vite) architecture.

## Requirements
- Node.js (v18 or higher recommended)
- npm (Node Package Manager)

---

## 1. Running the Backend

The backend server manages the API, database operations (via a local JSON-based JSONdb), and handles authentication.

1. Open a terminal and navigate to the `backend` folder:
   ```bash
   cd "f:\POS New\backend"
   ```
2. Install the necessary backend dependencies:
   ```bash
   npm install
   ```
3. Start the backend server:
   ```bash
   node server.js
   ```
   *The backend should now be running (usually on `http://localhost:5000` or port defined in index.js).*

---

## 2. Running the Frontend

The frontend is a React application powered by Vite, containing both the Admin Dashboard and the Cashier Panel.

1. Open a **new, separate** terminal window and navigate to the `frontend` folder:
   ```bash
   cd "f:\POS New\frontend"
   ```
2. Install the necessary frontend dependencies:
   ```bash
   npm install
   ```
3. Start the frontend development server:
   ```bash
   npm run dev
   ```
   *Vite will start a local server and provide a local URL (usually `http://localhost:5173`).*

4. Open the provided local URL in your web browser to access the POS application.

---

## Default Login Credentials

If you need to log in to test the system, you can use the default accounts seeded in the database:

**Admin Account:**
- **Username:** admin
- **Password:** admin123

**Cashier Account:**
- **Username:** cashier
- **Password:** cashier123

## Features included
- Secure JWT-based Authentication
- Admin Dashboard with detailed sales reports & SVG charts
- Inventory Management (Add, Edit, Delete, GRN tracking)
- Cashier POS panel with a Shopping Cart
- Cash Drawer auditing / Shift management (Z-Reports)
- Sales Return and stock restocking integration
