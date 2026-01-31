#!/bin/bash
set -e

echo "Building frontend..."
npm run build

if [ -f "frontend/dist/index.html" ]; then
    echo "Frontend build successful: frontend/dist/index.html exists."
else
    echo "Frontend build failed: frontend/dist/index.html not found."
    exit 1
fi
