# Sonido Líquido Crew

> El colectivo de Hip Hop más representativo de México. Fundado en 1999 en la Ciudad de México.

## Overview

This is a full-stack web application for Sonido Líquido Crew music collective, featuring:

- **Public Website**: Artist profiles, discography, videos, events, store, and more
- **Admin Dashboard**: Content management, sync services, analytics, and settings
- **API Integration**: Spotify, YouTube, and Dropbox sync
- **E-commerce**: Optional Stripe integration for merchandise
- **Email Marketing**: Optional Mailchimp integration for newsletters

## Tech Stack

- **Framework**: Next.js 15 (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **Components**: shadcn/ui
- **Database**: SQLite with Drizzle ORM
- **Validation**: Zod
- **Forms**: React Hook Form
- **Data Fetching**: TanStack Query (admin)
- **Auth**: NextAuth.js

## Getting Started

### Prerequisites

- Node.js 18+
- Bun (recommended) or npm

### Installation

```bash
# Clone the repository
git clone <repository-url>
cd sonido-liquido-crew

# Install dependencies
bun install

# Copy environment variables
cp .env.example .env.local

# Configure your environment variables in .env.local
```

### Environment Variables

See `.env.example` for all required and optional variables.

**Required:**
- `NEXTAUTH_SECRET` - Authentication secret
- `SPOTIFY_CLIENT_ID` - Spotify API credentials
- `SPOTIFY_CLIENT_SECRET`
- `YOUTUBE_API_KEY` - YouTube Data API key
- `DROPBOX_ACCESS_TOKEN` - Dropbox API token

**Optional:**
- `STRIPE_SECRET_KEY` - For e-commerce
- `MAILCHIMP_API_KEY` - For email marketing

### Database Setup

```bash
# Generate migrations
bun run db:generate

# Run migrations
bun run db:migrate

# Seed the database
bun run db:seed
```

### Development

```bash
# Start development server
bun run dev

# Open http://localhost:3000
```

### Build

```bash
bun run build
bun run start
```

## Project Structure

```
sonido-liquido-crew/
├── src/
│   ├── app/                 # Next.js App Router pages
│   │   ├── (public)/       # Public website pages
│   │   ├── admin/          # Admin dashboard pages
│   │   └── api/            # API routes
│   ├── components/          # React components
│   │   ├── ui/             # shadcn/ui components
│   │   ├── public/         # Public website components
│   │   └── admin/          # Admin dashboard components
│   ├── db/                  # Database
│   │   ├── schema/         # Drizzle schema
│   │   ├── migrations/     # Database migrations
│   │   └── seed.ts         # Seed script
│   ├── lib/                 # Utilities and clients
│   │   ├── clients/        # API clients (Spotify, YouTube, etc.)
│   │   ├── services/       # Business logic
│   │   └── repositories/   # Data access layer
│   └── types/               # TypeScript types
├── data/                    # SQLite database files
└── public/                  # Static assets
```

## Features

### Public Website

- Homepage with hero, featured releases, artist roster
- Artist profiles with Spotify integration
- Full discography with filtering
- Video gallery with YouTube embeds
- Events calendar
- Online store
- Newsletter signup
- Download gates for beats

### Admin Dashboard

- Dashboard summary with metrics
- Artist management with conflict detection
- Release management
- Video management
- Product management
- Order management
- Subscriber management
- Sync management (Spotify, YouTube, Dropbox)
- Site settings

## API Integrations

### Spotify

Used for:
- Artist information and images
- Album/release data
- Playlist information
- Embedded players

### YouTube

Used for:
- Video information
- Channel data
- Embedded players

### Dropbox

Used for:
- Media file storage
- Press kit downloads
- Beat preview files

## License

All rights reserved. © 2025 Sonido Líquido Crew
