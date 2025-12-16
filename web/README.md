# Yellow Grid Operator Web Application

**Production-grade React application for Field Service Management operators**

## Overview

This is the official Operator Web Application for the Yellow Grid platform. It is built following production specifications from `/documentation/` and is completely separate from the `/roadshow-mockup/` demo application.

## Key Features

### ✅ Implemented

1. **Authentication System**
   - SSO integration (PingID) ready
   - Email/password fallback for development
   - JWT token management with refresh
   - Protected routes with RBAC
   - Permission and role-based access control

2. **Service Order Dashboard**
   - List view with filters (status, priority, sales potential, risk level)
   - Search functionality
   - Pagination support
   - Responsive table layout
   - Badge-based status indicators

3. **Service Order Detail View**
   - Complete order information
   - AI Sales Potential Assessment display
   - AI Risk Assessment display
   - Go Execution monitoring
   - Quick actions sidebar

### 🚧 In Progress / Planned

4. **Assignment Interface**
   - Provider search and filtering
   - Assignment transparency (scoring breakdown)
   - Direct/Offer/Broadcast assignment modes
   - Provider acceptance tracking

5. **Provider Management**
   - CRUD operations for providers
   - Work team management
   - Calendar availability view
   - Performance metrics

6. **Calendar View**
   - Provider availability heatmap
   - Service order scheduling
   - Conflict detection

7. **Task Management**
   - Operator task list
   - SLA tracking
   - Priority-based sorting
   - Auto-generated tasks from AI assessments

## Tech Stack

- **Framework**: React 18.2 + TypeScript 5.3
- **Build Tool**: Vite 5.0
- **Routing**: React Router v6
- **State Management**: Zustand + React Query (TanStack Query)
- **Styling**: Tailwind CSS 3.4
- **Forms**: React Hook Form + Zod validation
- **HTTP Client**: Axios
- **Testing**: Vitest + React Testing Library
- **Date Handling**: date-fns
- **Icons**: Lucide React
- **Notifications**: Sonner

## Project Structure

```
web/
├── src/
│   ├── components/          # Reusable UI components
│   │   ├── auth/           # Authentication components
│   │   └── layout/         # Layout components
│   ├── contexts/           # React contexts (Auth, etc.)
│   ├── hooks/              # Custom React hooks
│   ├── pages/              # Page components
│   │   ├── auth/          # Login, callback pages
│   │   ├── service-orders/ # Service order pages
│   │   ├── assignments/    # Assignment pages
│   │   ├── providers/      # Provider management
│   │   └── tasks/         # Task management
│   ├── services/           # API service layer
│   ├── types/              # TypeScript type definitions
│   ├── utils/              # Utility functions
│   ├── config/             # Configuration files
│   ├── styles/             # Global styles
│   └── test/               # Test setup and utilities
├── public/                 # Static assets
├── index.html             # HTML template
├── vite.config.ts         # Vite configuration
├── tailwind.config.js     # Tailwind configuration
├── tsconfig.json          # TypeScript configuration
└── package.json           # Dependencies and scripts
```

## Getting Started

### Prerequisites

- Node.js >= 20.0.0
- npm >= 9.0.0

### Installation

```bash
cd web
npm install
```

### Environment Configuration

Copy `.env.example` to `.env` and configure:

```env
# API Configuration
VITE_API_BASE_URL=http://localhost:3001/api/v1

# Authentication
VITE_SSO_ISSUER=https://sso.yellowgrid.com
VITE_SSO_CLIENT_ID=yellow-grid-operator-web
VITE_SSO_REDIRECT_URI=http://localhost:3000/auth/callback

# Feature Flags
VITE_ENABLE_AI_FEATURES=true
VITE_ENABLE_CALENDAR_VIEW=true
```

### Development

```bash
# Start development server
npm run dev

# Type checking
npm run type-check

# Linting
npm run lint

# Testing
npm run test
npm run test:ui
npm run test:coverage
```

### Building for Production

```bash
npm run build
npm run preview  # Preview production build
```

## Authentication

### SSO (PingID) Flow

1. User clicks "Sign in with SSO"
2. Redirected to PingID authorization endpoint
3. User authenticates with PingID
4. Redirected back to `/auth/callback` with authorization code
5. Code exchanged for access and refresh tokens
6. Tokens stored in localStorage
7. User redirected to dashboard

### Development Login

For development/testing, use email/password authentication:

```
Email: operator@yellowgrid.com
Password: [from backend seed data]
```

## API Integration

The app communicates with the NestJS backend at `/src/` (not the mockup).

### API Client Features

- Automatic JWT token injection
- Request/response interceptors
- Error handling (401, 403, 500)
- Correlation ID tracking
- Development logging

### API Services

- `authService` - Authentication operations
- `serviceOrderService` - Service order CRUD + AI assessments
- More services to be added...

## Security

### Authentication

- JWT-based authentication
- Automatic token refresh
- Secure token storage (localStorage)
- CSRF protection on OAuth flow

### Authorization

- Role-based access control (RBAC)
- Permission checking at component level
- Protected routes
- API-level permission validation

### Best Practices

- No secrets in code (use env vars)
- Input validation on all forms (Zod schemas)
- XSS prevention (React escaping)
- HTTPS only in production
- Rate limiting (backend)

## Testing

### Unit Tests

```bash
npm run test
```

### Coverage Requirements

- Overall: ≥80%
- Critical flows: ≥90%

### Test Structure

```typescript
// Example test
import { render, screen } from '@testing-library/react';
import LoginPage from '@/pages/auth/LoginPage';

describe('LoginPage', () => {
  it('should render SSO login button', () => {
    render(<LoginPage />);
    expect(screen.getByText(/Sign in with SSO/i)).toBeInTheDocument();
  });
});
```

## Styling

### Tailwind CSS

- Utility-first approach
- Custom design tokens in `tailwind.config.js`
- Component classes in `src/styles/index.css`

### Component Classes

```css
.btn              # Base button
.btn-primary      # Primary action button
.btn-secondary    # Secondary button
.input            # Form input
.card             # Card container
.badge            # Status badge
.table            # Table
```

## State Management

### React Query (TanStack Query)

Used for server state:

```typescript
const { data, isLoading } = useQuery({
  queryKey: ['service-orders', filters],
  queryFn: () => serviceOrderService.getAll(filters),
});
```

### Zustand

Used for client state (if needed):

```typescript
// Example store
const useStore = create((set) => ({
  user: null,
  setUser: (user) => set({ user }),
}));
```

## Conventions

### File Naming

- Components: `PascalCase.tsx` (e.g., `LoginPage.tsx`)
- Services: `kebab-case.ts` (e.g., `auth-service.ts`)
- Types: `index.ts` (centralized)
- Hooks: `use*.ts` (e.g., `useAuth.ts`)

### Code Style

- TypeScript strict mode enabled
- No `any` types (use `unknown` if needed)
- Explicit return types on functions
- 2-space indentation
- ESLint + Prettier enforced

### Git Commits

Follow Conventional Commits:

```
feat(auth): add SSO login flow
fix(service-orders): correct pagination logic
docs(readme): update API integration section
```

## Performance

### Optimization Strategies

- Code splitting (React.lazy)
- Route-based chunking (Vite)
- React Query caching (5min default)
- Virtualization for long lists (planned)
- Image optimization (planned)

### Bundle Size

- React vendor chunk
- Query vendor chunk
- Route-based chunks

## Deployment

### Environment Variables

Set in deployment platform:

- `VITE_API_BASE_URL` - Backend API URL
- `VITE_SSO_ISSUER` - SSO provider URL
- `VITE_ENV` - production

### Build Output

```
dist/
├── assets/        # Chunked JS/CSS
├── index.html     # Entry point
└── vite.svg       # Icon
```

### Hosting

Can be deployed to:

- AWS S3 + CloudFront
- Netlify
- Vercel
- Azure Static Web Apps
- Any static hosting

### HTTPS Required

- Production must use HTTPS
- SSO callback requires HTTPS
- Secure cookies require HTTPS

## Troubleshooting

### Common Issues

**API calls failing with CORS**
- Ensure backend has correct CORS configuration
- Check `VITE_API_BASE_URL` is correct

**SSO redirect loop**
- Verify `VITE_SSO_REDIRECT_URI` matches backend config
- Check OAuth state validation

**Build fails with TypeScript errors**
- Run `npm run type-check` to see full errors
- Ensure all types are properly imported

**Tests failing**
- Clear test cache: `rm -rf node_modules/.vitest`
- Ensure test setup is imported

## Documentation

- **Product Specs**: `/documentation/`
- **API Docs**: `/documentation/api/`
- **Architecture**: `/documentation/architecture/`
- **Security**: `/documentation/security/`

## Contributing

1. Read `/documentation/development/` guidelines
2. Create feature branch from `main`
3. Follow code style and testing requirements
4. Submit PR with clear description
5. Ensure CI passes

## License

PROPRIETARY - © 2025 Adeo Home Services

---

**Status**: In Development
**Version**: 0.1.0
**Last Updated**: 2025-01-18
