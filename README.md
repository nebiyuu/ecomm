# ecom

A lightweight Node.js / Express backend for an e-commerce-style application supporting sellers, buyers, products, rentals, and orders. This repository provides routes, controllers, and models wired to a PostgreSQL database via Sequelize and image upload via Cloudinary.

## Features
- RESTful endpoints for products, orders, users (sellers/buyers), rentals, and admin actions
- Image upload and storage using Cloudinary
- Input validation and authentication middleware (JWT)
- Database models defined with Sequelize for PostgreSQL

## Requirements
- Node.js (v14+ recommended)
- PostgreSQL
- Environment variables for database, JWT, and Cloudinary credentials

## Quick start
1. Clone the repository
2. Install dependencies:

```bash
npm install
```

3. Create a `.env` file at the project root and set required environment variables (examples below).

4. Start the app in development:

```bash
npm run dev
```

Or run in production mode:

```bash
npm start
```

## Configuration
The `config` folder contains setup helpers:
- `config/database.js` — Sequelize / Postgres setup
- `config/cloudinary.js` — Cloudinary configuration
- `config/upload.js` — Multer / storage settings

Typical environment variables used by the app:
- `PORT` — server port (e.g. 5000)
- `DB_HOST`, `DB_PORT`, `DB_NAME`, `DB_USER`, `DB_PASS` — Postgres connection
- `JWT_SECRET`, `JWT_EXPIRES_IN` — JWT settings
- `BCRYPT_SALT_ROUNDS` — password hashing rounds
- `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS` — email / SMTP settings used by `utils/mailer.js`
- `CLOUD_NAME`, `CLOUD_KEY`, `CLOUD_SECRET` — Cloudinary credentials (or `CLOUDINARY_URL`)

## Project structure (important folders)
- `routes/` — Express route definitions
- `controllers/` — Request handlers and business logic
- `model/` — Sequelize models
- `config/` — External service and DB configuration
- `middlewares/` — Auth and validators
- `services/` — Reusable service-layer code
- `test/` — Tests and integration checks

## Testing
There are sample tests under the `test/` folder.

## Notes
- The server entry point is `server.js`.
- See `package.json` for available npm scripts (`start`, `dev`).
- Update environment variables and database migrations before first run.

## Status
- In progress: core API, models, and upload flows are implemented.
- Planned: integrate Chapa payment gateway for checkout and payments.

 