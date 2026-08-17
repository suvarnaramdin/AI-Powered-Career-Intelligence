# Railway Deployment Guide

This project is already built around a FastAPI backend, React/Vite frontend, and MySQL database. The production deployment target is:

- Frontend: Vercel
- Backend: Railway
- Database: Railway MySQL

## 1) Create the Railway project

1. Sign in to Railway and create a new project.
2. Choose the repository that contains this codebase.
3. Keep the project name and region as needed for your deployment.

## 2) Configure the backend service

In Railway, add a new service for the backend and set the service root directory to:

backend

Set the start command to:

uvicorn main:app --host 0.0.0.0 --port $PORT

This matches the application entry point in the backend folder and respects Railway's assigned port.

## 3) Add a Railway MySQL database

1. In Railway, add a new MySQL service.
2. Wait for the service to provision.
3. Copy the provided MySQL connection variables from the Railway dashboard.

## 4) Configure backend environment variables

Set the following environment variables in the backend service:

- DATABASE_URL=<Railway MySQL connection URL>
- JWT_SECRET_KEY=<secure random value>
- SECRET_KEY=<secure random value>
- JWT_EXPIRES_MINUTES=60
- CORS_ORIGINS=https://ai-powered-career-intelligence.vercel.app
- FRONTEND_URL=https://ai-powered-career-intelligence.vercel.app

If your application later uses additional API credentials, add them as environment variables only when the code actually references them.

## 5) Import the SQL backup into Railway MySQL

The repository includes the schema/data backup file:

internship_db.sql

Import it into the Railway MySQL service using the MySQL client or a migration tool connected to the Railway database.

Example using the local MySQL client against the Railway connection details:

mysql -u <user> -p -h <host> -P <port> <database_name> < internship_db.sql

If you are using a GUI client, connect to the Railway MySQL instance and run the SQL script from the repository.

Do not overwrite the project schema blindly. Confirm the database name and import target before executing the script.

## 6) Deploy the backend

1. Save the backend environment variables.
2. Trigger a deployment in Railway.
3. Confirm the service starts successfully.
4. Open the generated Railway backend URL and verify health is reachable.

## 7) Obtain the Railway backend URL

After deployment, Railway will provide a public URL such as:

https://<project-name>.up.railway.app

Use this URL as the backend origin for the frontend.

## 8) Configure Vercel frontend environment variables

In Vercel, set the frontend environment variable:

- VITE_API_URL=https://<your-railway-backend-url>

This is the only production API base URL the React app should use.

## 9) Redeploy the Vercel frontend

After setting the Vercel environment variable:

1. Trigger a redeploy in Vercel.
2. Confirm the frontend loads without local API fallback behavior in production.

## 10) Test the deployed application

Use the production URL and verify:

1. User registration
2. User login
3. Admin login
4. Admin dashboard
5. Resume upload
6. ATS analysis
7. Career recommendations
8. Job recommendations
9. Admin modules
10. Database operations

## 11) Local development remains supported

Local development continues to run with:

- Frontend: http://localhost:5173/
- Backend: http://127.0.0.1:8000/
- MySQL: XAMPP MySQL database named internship_db

The app uses environment variables so local settings continue to work while production uses Railway values.

## 12) Production safety notes

- Do not commit .env files or secrets.
- Do not use SQLite in production.
- Do not expose JWT secret values in API responses or logs.
- Do not hardcode the Railway database password or backend URL into source files.
- Keep the existing XAMPP MySQL workflow for local development.
