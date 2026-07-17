# EasyBallot

[![License: MIT](https://img.shields.io/badge/license-MIT-blue.svg?style=flat-square)](LICENSE)
[![Version](https://img.shields.io/badge/version-1.0.0-brightgreen.svg?style=flat-square)](package.json)
[![React](https://img.shields.io/badge/react-19-61dafb.svg?style=flat-square&logo=react&logoColor=white)](https://react.dev)
[![TypeScript](https://img.shields.io/badge/typescript-6-3178c6.svg?style=flat-square&logo=typescript&logoColor=white)](https://www.typescriptlang.org)
[![Node.js](https://img.shields.io/badge/node.js-express-339933.svg?style=flat-square&logo=nodedotjs&logoColor=white)](https://nodejs.org)
[![SQLite](https://img.shields.io/badge/database-better--sqlite3-003b57.svg?style=flat-square&logo=sqlite&logoColor=white)](https://github.com/WiseLibs/better-sqlite3)

**Publisher: Northland Studio**

<img src="client/public/favicon.svg" alt="EasyBallot" width="64" height="64" />

A simple voting and polling platform designed for class singing competitions and similar scenarios. Create voting projects with rich media options, collect votes securely, and export results -- all without requiring voter registration.

## Features

- **Customizable Voting Projects** -- Create voting projects with multiple items and options. Set start/end times, vote limits, result display preferences, and custom privacy policies.
- **Rich Media Support** -- Options support images and videos uploaded via Qiniu cloud storage, with automatic CDN delivery.
- **No-Login Voting** -- Voters can participate without registration. Each vote is verified against a device fingerprint to prevent duplicate submissions.
- **IP Rate Limiting** -- Server-side IP-based rate limiting prevents automated ballot stuffing.
- **Privacy Policy with Consent Gate** -- Built-in privacy policy page with mandatory consent before voting. Customizable for each voting project.
- **Verification Codes** -- Each vote generates a unique verification code, allowing voters to audit their vote independently.
- **XLSX Export** -- Administrators can export voting results as XLSX spreadsheets with timestamps and verification codes.
- **Apple-Inspired Minimalist Design** -- Clean, modern UI with dark mode support. Responsive layout works across desktop and mobile.

## Tech Stack

| Layer    | Technology                          |
| -------- | ----------------------------------- |
| Frontend | React 19, TypeScript, Vite          |
| Routing  | React Router v7                     |
| Styling  | CSS (dark mode, responsive)         |
| Backend  | Node.js, Express, TypeScript        |
| Database | better-sqlite3                      |
| Auth     | JWT (admin), device fingerprint (voter) |
| Storage  | Qiniu Cloud (Kodo)                  |
| Export   | ExcelJS                             |
| Security | FingerprintJS, IP rate limiting     |

## Quick Start

### Prerequisites

- Node.js 18+
- npm 9+
- A Qiniu Cloud account (for media uploads)

### Setup

```bash
# Clone the repository
git clone <repo-url>
cd EasyBallot

# Configure environment
cp .env.template .env
# Edit .env with your Qiniu credentials, admin password, and JWT secret

# Install dependencies
cd client && npm install
cd ../server && npm install
cd ..

# Start development servers
npm run dev:server   # Starts on port 3070
npm run dev:client   # Starts Vite dev server with hot reload
```

The client dev server will proxy API requests to the backend automatically. Open `http://localhost:5173` to access the application.

### Admin Access

1. Navigate to `/admin/login`
2. Log in with the credentials set in your `.env` file (`ADMIN_USERNAME` / `ADMIN_PASSWORD`)
3. Create a new voting project from the admin dashboard

## Deployment

### Server Details

- **Host**: 115.190.153.44
- **Port**: 3070
- **Domain**: [tp.xuanjian.top](http://tp.xuanjian.top)
- **Process Manager**: PM2

### One-Command Deploy

```bash
npm run deploy
```

This runs the `deploy.js` script which:

1. Builds the client and server
2. Packages all necessary files
3. Uploads via SCP to `/opt/easyballot`
4. Installs production dependencies on the server
5. Restarts the application via PM2

### Environment Variables for Deploy

Override defaults via environment variables:

| Variable       | Default           | Description        |
| -------------- | ----------------- | ------------------ |
| `DEPLOY_HOST`  | `115.190.153.44`  | Server IP          |
| `DEPLOY_PORT`  | `3070`            | Application port   |
| `DEPLOY_DOMAIN`| `tp.xuanjian.top` | Public domain      |
| `DEPLOY_PATH`  | `/opt/easyballot` | Server deploy path |
| `DEPLOY_USER`  | `root`            | SSH user           |

Or pass `--user=<name>` as a command line argument:

```bash
npm run deploy -- --user=deployer
```

### Manual Deployment

```bash
# Build
npm run build

# Copy server/dist, server/package.json, client/dist, and .env to server
# Then on the server:
cd /opt/easyballot/server
npm install --production
pm2 start ecosystem.config.js
pm2 save
```

### PM2 Configuration

The server includes `ecosystem.config.js` for PM2 process management:

```bash
pm2 start ecosystem.config.js
pm2 save
pm2 startup
```

## Project Structure

```
EasyBallot/
├── client/                 # React frontend (Vite)
│   ├── public/             # Static assets
│   └── src/
│       ├── components/     # Reusable UI components
│       ├── pages/          # Page components
│       │   └── admin/      # Admin panel pages
│       ├── styles/         # Global CSS
│       ├── api.ts          # API client
│       └── App.tsx         # Root component with routing
├── server/                 # Express backend
│   └── src/
│       ├── db/             # Database initialization and queries
│       ├── middleware/     # Auth and rate limiting middleware
│       └── routes/         # API route handlers
├── .env.template           # Environment variables template
├── deploy.js               # Automated deployment script
└── package.json            # Root workspace scripts
```

## License

MIT License. See [LICENSE](LICENSE) for details.
