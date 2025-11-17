# Yellow Grid Web Application

React + TypeScript + Vite web application for the Yellow Grid Field Service Management platform.

## Features

- **Service Orders Dashboard**: View and manage service orders with AI-powered sales potential and risk assessments
- **Assignments Management**: Provider assignment tracking with date negotiation and auto-accept workflows
- **Execution Tracking**: Field operations monitoring with checklists, GPS tracking, and media uploads
- **Provider Management**: Provider tier management, risk monitoring, and certification tracking
- **Tasks & Alerts**: Operator task management and system alerts
- **WCF & Contracts**: Work closing form and contract lifecycle management

## Tech Stack

- **React 18** - UI framework
- **TypeScript** - Type-safe development
- **Vite** - Fast build tool
- **Tailwind CSS** - Utility-first CSS framework
- **React Router** - Client-side routing
- **Axios** - HTTP client
- **Zustand** - State management (optional)
- **Lucide React** - Icons

## Getting Started

### Prerequisites

- Node.js >= 20.0.0
- npm >= 10.0.0

### Installation

```bash
# From the monorepo root
npm install

# Or from apps/web
cd apps/web
npm install
```

### Development

```bash
# From monorepo root
npm run dev:web

# Or from apps/web
npm run dev
```

The app will be available at http://localhost:3000

### Build

```bash
npm run build
```

### Environment Variables

Copy `.env.example` to `.env`:

```bash
cp .env.example .env
```

Configure the API URL:

```env
VITE_API_URL=http://localhost:3001
```

## API Integration

All backend endpoints are accessed via type-safe API clients in `src/api/`:

- `providersApi` - Provider management (tier, risk, certifications)
- `serviceOrdersApi` - Service orders (AI assessments, Go Exec monitoring)
- `assignmentsApi` - Provider assignments (acceptance, date negotiation)
- `executionsApi` - Field operations (check-in/out, checklists, media)
- `tasksApi` - Tasks and alerts management
- `wcfApi` - WCF and contract workflows

## Project Structure

```
apps/web/
├── src/
│   ├── api/              # API client services
│   ├── components/       # Reusable UI components
│   ├── pages/            # Route pages
│   ├── stores/           # State management (Zustand)
│   ├── types/            # TypeScript type definitions
│   ├── utils/            # Helper functions
│   ├── App.tsx           # Main app component
│   ├── main.tsx          # Entry point
│   └── index.css         # Global styles (Tailwind)
├── index.html
├── vite.config.ts
├── tailwind.config.js
└── package.json
```

## Development Roadmap

- [x] Project setup and configuration
- [x] API client services for all modules
- [x] Dashboard with statistics
- [x] Service Orders list with AI assessment filters
- [ ] Service Order detail view with AI controls
- [ ] Assignments list with date negotiation UI
- [ ] Execution tracking with checklist UI
- [ ] Provider management with tier/risk controls
- [ ] Tasks & Alerts dashboard
- [ ] WCF and Contract workflows
- [ ] Real-time updates (WebSocket)
- [ ] Mobile responsive design
- [ ] Unit tests (Vitest)
- [ ] E2E tests (Playwright)

## License

UNLICENSED - Internal Yellow Grid project
