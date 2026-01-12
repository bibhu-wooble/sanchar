This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Database Setup (Neon)

This project uses [Neon](https://neon.tech) as the PostgreSQL database with Prisma.

### 1. Get Your Neon Connection String

1. Sign up or log in to [Neon](https://neon.tech)
2. Create a new project or select an existing one
3. Go to your project dashboard and click **Connect**
4. Copy the connection string (it will look like: `postgresql://user:password@host/database?sslmode=require`)

### 2. Configure Environment Variables

Create a `.env` file in the root directory:

```bash
DATABASE_URL="postgresql://user:password@host/database?sslmode=require&connect_timeout=10"
```

**For connection pooling (recommended for serverless):**
- Use Neon's pooled connection endpoint by adding `-pooler` to the hostname
- Example: `postgresql://user:password@host-pooler/database?sslmode=require`

### 3. Generate Prisma Client

```bash
npm run db:generate
```

### 4. Push Schema to Database

```bash
npm run db:push
```

Or create a migration:

```bash
npm run db:migrate
```

### 5. Test the Connection

Visit `/api/test-db` in your browser or use:

```bash
curl http://localhost:3000/api/test-db
```

## Getting Started

First, set up your database connection (see above), then run the development server:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

## Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run start` - Start production server
- `npm run db:generate` - Generate Prisma Client
- `npm run db:push` - Push schema changes to database
- `npm run db:migrate` - Create and apply migrations
- `npm run db:studio` - Open Prisma Studio

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.
- [Prisma Documentation](https://www.prisma.io/docs) - learn about Prisma ORM.
- [Neon Documentation](https://neon.tech/docs) - learn about Neon serverless Postgres.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.


test 