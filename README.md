# City Rankings

A web application to compare US cities based on weather, cost of living, demographics, and more. Customize your preferences to find the best city for you.

## Features

- **Interactive preference controls** - Sliders and toggles to weight what matters to you
- **Real-time scoring** - Rankings update instantly as you change preferences
- **Hierarchical preferences** - Basic options always visible, advanced options collapsible
- **Tooltips** - Helpful descriptions for every preference
- **Export/Import** - Save your preferences as JSON and share them
- **No account required** - Preferences stored locally in your browser

## Tech Stack

- **Frontend:** Next.js 14+ (App Router), React, TypeScript
- **Styling:** Tailwind CSS + shadcn/ui
- **State:** Zustand (preferences), TanStack Query (server data)
- **Database:** PostgreSQL (Neon free tier)
- **ORM:** Prisma
- **Charts:** Recharts
- **Deployment:** Vercel

## Getting Started

### Prerequisites

- Node.js 18+
- npm
- PostgreSQL database (or [Neon](https://neon.tech) free tier)

### 1. Clone the repository

```bash
git clone <your-repo-url>
cd cities-app
```

### 2. Install dependencies

```bash
npm install
```

### 3. Set up environment variables

Copy the example environment file:

```bash
cp .env.example .env
```

Edit `.env` and add your database URL:

```env
# For Neon PostgreSQL (recommended):
DATABASE_URL="postgresql://user:password@host:5432/database?sslmode=require"

# Admin password for data refresh
ADMIN_PASSWORD="change-this-in-production"
```

**Getting a Neon database URL:**
1. Go to [neon.tech](https://neon.tech) and create a free account
2. Create a new project
3. Copy the connection string from the dashboard

### 4. Set up the database

Push the Prisma schema to create tables:

```bash
npm run db:push
```

Seed the database with city data from the Excel file:

```bash
npm run db:seed
```

### 5. Start the development server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## Available Scripts

| Script | Description |
|--------|-------------|
| `npm run dev` | Start development server |
| `npm run build` | Build for production |
| `npm run start` | Start production server |
| `npm run lint` | Run ESLint |
| `npm run db:generate` | Generate Prisma client |
| `npm run db:push` | Push schema to database |
| `npm run db:migrate` | Run database migrations |
| `npm run db:seed` | Seed database from Excel |
| `npm run db:studio` | Open Prisma Studio |

## Project Structure

```
cities-app/
├── prisma/
│   └── schema.prisma          # Database schema
├── scripts/
│   └── seed.ts                # Excel import script
├── src/
│   ├── app/
│   │   ├── api/               # API routes
│   │   ├── layout.tsx         # Root layout
│   │   └── page.tsx           # Main dashboard
│   ├── components/
│   │   ├── preferences/       # Preference controls
│   │   ├── rankings/          # Rankings display
│   │   └── ui/                # shadcn/ui components
│   ├── hooks/                 # React hooks
│   ├── lib/
│   │   ├── db.ts              # Prisma client
│   │   ├── scoring.ts         # Scoring algorithms
│   │   └── store.ts           # Zustand store
│   └── types/                 # TypeScript types
└── package.json
```

## Data Sources

The app uses data from:
- [Zillow Research](https://zillow.com/research/data/) - Home value index (ZHVI)
- US Census Bureau - Demographics
- FBI Crime Data Explorer - Crime statistics
- Various sources for weather, walkability, etc.

## Deployment

### Vercel (Recommended)

1. Push your code to GitHub
2. Import the project in [Vercel](https://vercel.com)
3. Add environment variables in Vercel dashboard
4. Deploy

### Environment Variables for Production

Make sure to set these in your deployment platform:
- `DATABASE_URL` - Your PostgreSQL connection string
- `ADMIN_PASSWORD` - A secure password for admin functions

## License

MIT
