# WattWise

WattWise is an AI-powered household energy intelligence platform. It helps users upload electricity bills, extract billing details with OCR, review usage history, estimate appliance contributions, forecast future bills, and get personalized recommendations for lowering energy costs.

## What This Project Includes

- **Next.js frontend** for authentication, onboarding, dashboards, bill history, predictions, recommendations, assistant chat, and settings.
- **FastAPI backend** for bill upload, OCR parsing, bill persistence, seasonal analysis, behavioral estimation, recommendations, predictions, and assistant responses.
- **Supabase** for authentication, PostgreSQL data storage, row-level security, and bill file storage.
- **Performance optimizations** for deployment, including route prefetching, dashboard loading states, cached client data hooks, and lazy-loaded chart bundles.

## Main Features

- Email/password and Google authentication through Supabase.
- Guided household onboarding for location, home type, family size, room count, and appliance profile.
- Bill upload and OCR extraction for images/PDFs.
- Manual bill correction and review workflow.
- Bill history with soft delete, restore, and permanent delete support.
- Dashboard analytics for monthly trends, seasonal comparison, appliance contribution, and bill summaries.
- Future bill prediction with confidence and budget risk.
- Personalized energy-saving recommendations.
- Energy assistant chat using the user's bill and household context.

## Tech Stack

### Frontend

- Next.js 14
- React 18
- TypeScript
- Tailwind CSS
- Recharts
- Supabase JS client
- Lucide React icons

### Backend

- FastAPI
- Supabase Python client
- PyMuPDF
- OpenCV
- Pillow
- Tesseract OCR
- NumPy
- PyJWT

### Database

- Supabase PostgreSQL
- Row-level security policies
- Tables for users, appliances, bills, assistant conversations, and analysis data

## Project Structure

```txt
.
├── app/                    # Next.js App Router pages and API proxy
├── components/             # UI, dashboard, auth, chart, and layout components
├── lib/                    # Frontend hooks, Supabase clients, utilities, analytics logic
├── backend/                # FastAPI OCR and intelligence API
├── supabase/               # SQL schema for database tables and policies
├── middleware.ts           # Auth middleware for protected dashboard routes
├── package.json            # Frontend dependencies and scripts
└── README.md
```

## Environment Variables

Create a local `.env.local` file for the frontend:

```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_or_publishable_key
NEXT_PUBLIC_API_BASE_URL=http://localhost:8000
```

For the backend, create a backend environment file or configure these variables in your backend host:

```env
SUPABASE_URL=your_supabase_project_url
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key
SUPABASE_JWT_SECRET=your_supabase_jwt_secret
SUPABASE_STORAGE_BUCKET=bills
CORS_ORIGINS=http://localhost:3000,https://your-vercel-domain.vercel.app
```

Never commit `.env.local` or service-role keys to GitHub.

## Database Setup

1. Create a Supabase project.
2. Open the Supabase SQL Editor.
3. Run the schema in:

```txt
supabase/schema.sql
```

4. Create or confirm a storage bucket named:

```txt
bills
```

5. Enable the auth providers you want to support.

## Run Locally

Install frontend dependencies:

```bash
npm install
```

Start the frontend:

```bash
npm run dev
```

The frontend runs at:

```txt
http://localhost:3000
```

Install backend dependencies:

```bash
cd backend
pip install -r requirements.txt
```

Start the backend:

```bash
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

The backend health check is:

```txt
http://localhost:8000/health
```

## Frontend Scripts

```bash
npm run dev      # Start local development server
npm run build    # Create optimized production build
npm run start    # Start production server after build
npm run lint     # Run Next.js lint checks
```

## Backend API Overview

Key FastAPI routes include:

- `GET /health`
- `POST /api/bills/upload`
- `POST /api/bills/parse`
- `POST /api/bills/save`
- `GET /api/bills`
- `PUT /api/bills/{bill_id}`
- `DELETE /api/bills/{bill_id}`
- `POST /api/bills/{bill_id}/restore`
- `DELETE /api/bills/{bill_id}/permanent`
- `POST /api/seasonal/analyze`
- `POST /api/behavioral/analyze`
- `POST /api/recommendations/analyze`
- `POST /api/predictions/analyze`
- `GET /api/assistant/conversations`
- `POST /api/assistant/ask`

## Deployment

### Frontend on Vercel

Recommended settings:

```txt
Framework Preset: Next.js
Root Directory: ./
Build Command: npm run build
Install Command: npm install
Output Directory: Next.js default
```

Add these Vercel environment variables:

```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_or_publishable_key
NEXT_PUBLIC_API_BASE_URL=https://your-backend-domain
```

After deployment, add the Vercel callback URL in Supabase:

```txt
https://your-vercel-domain.vercel.app/auth/callback
```

### Backend Deployment

Deploy the FastAPI backend separately on a Python-friendly host such as Render, Railway, Fly.io, or a VPS.

Backend host requirements:

- Python dependencies from `backend/requirements.txt`
- Tesseract OCR installed on the server
- Environment variables for Supabase service access
- CORS origin set to your deployed frontend URL

Example start command:

```bash
uvicorn main:app --host 0.0.0.0 --port $PORT
```

## Performance Notes

The frontend includes deployment-focused optimizations:

- Dashboard routes use a shared loading state for faster perceived navigation.
- Heavy chart components are lazy-loaded with `next/dynamic`.
- Navigation routes are prefetched from desktop and mobile navigation.
- Client data hooks cache bills and appliance data to reduce repeated Supabase reads.
- Middleware skips Supabase auth work for Next.js prefetch requests.

## GitHub Notes

This repository should commit source code only. The `.gitignore` excludes:

- `node_modules/`
- `.next/`
- `.env.local`
- logs
- TypeScript build cache

Before pushing:

```bash
git status --short
```

You should not see `node_modules`, `.next`, or `.env.local`.
