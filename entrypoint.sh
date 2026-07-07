#!/bin/sh
set -e

echo "Prisma Database Setup: syncing schema..."
npx prisma db push --accept-data-loss

echo "Starting TeleFlow Server..."
exec node .output/server/index.mjs
