# Biblio Web Application

A Next.js application for managing a personal book library with features like:
- Book cataloging from shelf photos (OCR/Vision)
- Metadata enrichment via external APIs
- Book search and filtering
- Lending/borrowing tracking
- Knowledge graph visualization

## Getting Started

First, run the development server:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser.

## Environment Setup

Create a `.env.local` file in the `web` directory:

```bash
# Database (SQLite - path relative to web directory)
DATABASE_URL=file:../../data/biblio.db

# Optional: External API keys for enhanced features
GOOGLE_BOOKS_API_KEY=your_key_here
ANTHROPIC_API_KEY=your_key_here
```

## Tech Stack

- **Framework**: Next.js 16 with App Router
- **Database**: SQLite with Drizzle ORM
- **API**: tRPC for type-safe queries
- **UI**: Tailwind CSS + shadcn/ui components
- **Vision**: Claude/Gemini APIs for OCR

## Project Structure

```
web/
├── src/
│   ├── app/           # Next.js App Router pages
│   ├── components/    # React components
│   ├── server/
│   │   ├── routers/   # tRPC routers
│   │   ├── services/  # Business logic
│   │   └── schema.ts  # Database schema
│   └── client/        # tRPC client setup
└── public/            # Static assets
```

## Troubleshooting

For common issues and solutions, see the [troubleshooting guide](../../docs/troubleshooting.md).

## Development Notes

### Search Implementation
Search uses SQL `LIKE` with case-insensitive matching. The Drizzle ORM `like()` helper has issues with SQLite, so raw SQL fragments are used instead. See `/src/server/routers/root.ts` for the working implementation.

### Adding New Features
1. Add database columns to `schema.ts`
2. Create migration if needed
3. Add tRPC procedures in `routers/root.ts`
4. Create UI components in `components/`
5. Add pages in `app/`
