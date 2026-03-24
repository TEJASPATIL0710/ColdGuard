# ColdGuard

A temperature monitoring and cooling system simulation application with a React frontend and Express.js backend.

## Project Structure

```
ColdGuard/
├── coldguard/
│   ├── client/          # React frontend (Vite)
│   ├── server/          # Express.js backend
│   └── docs/            # Documentation
└── README.md
```

## Prerequisites

- Node.js (v14 or higher)
- npm or yarn
- MySQL database (if using persistence)

## Getting Started

### 1. Clone the Repository

```bash
cd ColdGuard
```

### 2. Setup Backend Server

Navigate to the server directory:

```bash
cd coldguard/server
```

Install dependencies:

```bash
npm install
```

Configure environment variables by creating a `.env` file in the server directory:

```env
PORT=4000
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=your_password
DB_NAME=coldguard
```

Start the server in development mode with file watching:

```bash
npm run dev
```

Or run the server without watching:

```bash
npm start
```

The server will start on `http://localhost:4000`

### 3. Setup Frontend Client

In a new terminal, navigate to the client directory:

```bash
cd coldguard/client
```

Install dependencies:

```bash
npm install
```

Start the development server:

```bash
npm run dev
```

The client will typically start on `http://localhost:5173`

### 4. Build for Production

To build the client for production:

```bash
npm run build
```

To preview the production build:

```bash
npm run preview
```

## Available Scripts

### Server

- `npm run dev` - Start server with file watching for development
- `npm start` - Start server in production mode

### Client

-`npm install` -To install the dependencies if not present
- `npm run dev` - Start development server with hot reload
- `npm run build` - Build for production
- `npm run preview` - Preview production build
- `npm run lint` - Run ESLint to check code quality

## API Endpoints

The backend provides the following endpoints:

- `GET /api/health` - Health check
- `GET /api/simulation` - Get current simulation data
- `GET /api/simulation/history` - Get simulation history
- `GET /api/simulation/events` - Get simulation events
- `POST /api/simulation/control` - Control simulation settings

## Documentation

For more detailed information, see the documentation in the `docs/` folder:

- `problem-statement.md` - Project requirements and problem description
- `solution.md` - Solution architecture and design
- `metrics.md` - Metrics and performance indicators
- `demo-flow.md` - Demo and usage flow

## Troubleshooting

- Ensure both the backend and frontend servers are running
- Check that the correct ports are available (4000 for backend, 5173 for frontend by default)
- Verify database connection if using persistence mode
