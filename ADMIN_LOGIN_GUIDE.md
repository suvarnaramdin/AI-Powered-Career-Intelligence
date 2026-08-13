# Admin Login Setup & Troubleshooting Guide

## ✅ Quick Setup

### Step 1: Ensure MySQL is Running
- Start XAMPP MySQL server
- Database: `internship_db`
- No username/password required (default XAMPP config)

### Step 2: Start Backend Server
```powershell
cd c:\Users\R SUVARNA\OneDrive\Desktop\project
.\.venv\Scripts\python.exe backend/main.py
```
- Backend runs on: `http://localhost:8000`
- API Docs available at: `http://localhost:8000/docs`

### Step 3: Start Frontend Server (in another terminal)
```powershell
cd c:\Users\R SUVARNA\OneDrive\Desktop\project\frontend
npm run dev
```
- Frontend runs on: `http://localhost:5173` or `http://localhost:5174`

### Step 4: Initialize Admin User
Run this command ONCE to create the admin account:
```powershell
cd c:\Users\R SUVARNA\OneDrive\Desktop\project
.\.venv\Scripts\python.exe backend/init_admin.py
```

**Output should show:**
```
✓ Admin user created successfully!
  Email: admin@example.com
  Password: AdminPassword123
  Name: Admin User
  Role: ADMIN

Admin can now login at: /admin/login
```

### Step 5: Login to Admin Dashboard
1. Open browser: `http://localhost:5173/admin/login` (or 5174)
2. Enter credentials:
   - **Email:** `admin@example.com`
   - **Password:** `AdminPassword123`
3. Click **Login**
4. You'll be redirected to `/admin/dashboard`

---

## 🔧 Troubleshooting

### Issue 1: "Incorrect email or password"

**Cause:** Admin user not in database yet

**Solution:** Run the initialization script:
```powershell
.\.venv\Scripts\python.exe backend/init_admin.py
```

### Issue 2: "Cannot connect to MySQL server"

**Cause:** XAMPP MySQL not running

**Solution:**
1. Open XAMPP Control Panel
2. Click "Start" for MySQL
3. Wait 5 seconds for it to start
4. Try login again

### Issue 3: Backend server not responding

**Cause:** Backend process not running or crashed

**Solution:**
1. Check if port 8000 is in use:
   ```powershell
   Get-NetTCPConnection -LocalPort 8000 -ErrorAction SilentlyContinue
   ```
2. If nothing shows up, backend isn't running
3. Start backend:
   ```powershell
   cd c:\Users\R SUVARNA\OneDrive\Desktop\project
   .\.venv\Scripts\python.exe backend/main.py
   ```

### Issue 4: Frontend not loading

**Cause:** Frontend dev server not running or port conflict

**Solution:**
1. Check if port 5173 is in use:
   ```powershell
   Get-NetTCPConnection -LocalPort 5173,5174 -ErrorAction SilentlyContinue
   ```
2. If frontend is on 5174, use that URL instead
3. Start frontend:
   ```powershell
   cd c:\Users\R SUVARNA\OneDrive\Desktop\project\frontend
   npm run dev
   ```

### Issue 5: "Session expired" after login

**Cause:** JWT token expired (configured for 30 minutes)

**Solution:**
1. Log out and log back in
2. Your session will be active for 30 minutes
3. You'll be automatically logged out after 30 minutes of inactivity

---

## 📊 Testing Admin Login

### Via Browser (Recommended)
1. Navigate to: `http://localhost:5173/admin/login`
2. Enter email and password
3. Click "Login"
4. Should redirect to dashboard

### Via PowerShell (For Debugging)
```powershell
$response = Invoke-WebRequest -Uri "http://127.0.0.1:8000/api/admin/login" `
  -Method POST `
  -ContentType "application/json" `
  -Body '{"email":"admin@example.com","password":"AdminPassword123"}' `
  -UseBasicParsing

$response.Content | ConvertFrom-Json
```

**Expected response:**
```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "token_type": "bearer",
  "user": {
    "id": 1,
    "name": "Admin User",
    "email": "admin@example.com",
    "role": "ADMIN"
  }
}
```

---

## 🔐 Admin Features After Login

Once logged in as admin, you can access:

- **Dashboard** (`/admin/dashboard`) - System stats and analytics
- **Users** (`/admin/users`) - Manage user accounts
- **Profiles** (`/admin/profiles`) - View user profiles
- **Resumes** (`/admin/resumes`) - Manage resumes
- **Jobs** (`/admin/jobs`) - Manage job listings
- **ATS Analysis** (`/admin/ats`) - AI resume analysis
- **Skills** (`/admin/skills`) - Skill tracking
- **Career Recommendations** (`/admin/career-recommendations`)
- **Courses** (`/admin/courses`) - Learning resources
- **Feedback** (`/admin/feedback`) - User feedback
- **Activity** (`/admin/activity`) - User activity log
- **Reports** (`/admin/reports`) - System reports
- **Notifications** (`/admin/notifications`) - System notifications
- **System** (`/admin/system`) - Health monitoring

---

## 🚀 Starting Everything (All-in-One)

Run this in **3 separate PowerShell terminals:**

**Terminal 1 - Start Backend:**
```powershell
cd c:\Users\R SUVARNA\OneDrive\Desktop\project
.\.venv\Scripts\python.exe backend/main.py
```

**Terminal 2 - Start Frontend:**
```powershell
cd c:\Users\R SUVARNA\OneDrive\Desktop\project\frontend
npm run dev
```

**Terminal 3 - Initialize Admin (run ONCE):**
```powershell
cd c:\Users\R SUVARNA\OneDrive\Desktop\project
.\.venv\Scripts\python.exe backend/init_admin.py
```

Then open browser to: `http://localhost:5173/admin/login`

---

## ✅ Checklist Before Login

- [ ] XAMPP MySQL is running
- [ ] Backend server is running on port 8000
- [ ] Frontend server is running on port 5173 or 5174
- [ ] Admin user initialized via `init_admin.py`
- [ ] No firewall blocking ports 8000, 5173, or 3306
- [ ] All terminals show no errors

---

**Admin Credentials:**
```
Email:    admin@example.com
Password: AdminPassword123
```

**Need help?** Check the terminal output for specific error messages.
