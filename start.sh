#!/bin/sh

# Wait for DB to be ready (optional, but recommended if database starts slowly)
# This requires netcat or similar, omitting for simplicity since prisma deploy handles retries sometimes
# or we just let it fail and docker restart will handle it.

echo "Running Prisma migrations..."
npx prisma migrate deploy

echo "Starting application..."
node dist/main.js
