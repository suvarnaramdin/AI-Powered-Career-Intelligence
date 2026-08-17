# Deployment Guide

This project is set up for frontend deployment on Vercel using a Vite app.

## Frontend deployment on Vercel

1. Push this repository to GitHub.
2. In Vercel, import the repository.
3. Set the project root to the frontend folder if Vercel asks for a folder.
4. Use the following build settings:
   - Build Command: `npm install && npm run build`
   - Output Directory: `dist`
5. Add environment variable for the backend URL:
   - `VITE_API_URL=https://your-render-or-railway-backend-url.example.com`

## Backend deployment

The FastAPI backend should be deployed separately on Render, Railway, or another Python host.

Example env vars for the backend:
- `JWT_SECRET=your-secret-key`
- `CORS_ORIGINS=https://your-frontend.vercel.app`

## Important note

The frontend no longer hardcodes localhost URLs; it reads the base URL from `VITE_API_URL`.
