# Axiso Green CRM - Authentication System Setup

This guide explains how to set up the authentication system with Supabase Auth and role-based access control.

## Overview

The authentication system provides:

- Email/password authentication via Supabase Auth
- Role-based access control (Admin vs Salesperson)
- Admin panel for user management
- Assigned leads view for salespersons
- Login/logout functionality

## Step 1: Connect Supabase

1. Click [Open MCP popover](#open-mcp-popover)
2. Find and connect to **Supabase**
3. Follow the prompts to authenticate and select your project

## Step 2: Set Environment Variables

Once Supabase is connected, set these environment variables:

```
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
```

You can find these values in your Supabase project:

1. Go to your Supabase dashboard
2. Navigate to **Settings > API**
3. Copy the **Project URL** and **anon/public key**

## Step 3: Create Database Tables

### 3.1 Create "users" Table (For Authentication)

Go to Supabase SQL Editor and run:

```sql
CREATE TABLE users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  phone TEXT NOT NULL,
  role TEXT CHECK (role IN ('admin', 'salesperson')) NOT NULL DEFAULT 'salesperson',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW())
);

-- Create index for faster queries
CREATE INDEX users_email_idx ON users(email);
CREATE INDEX users_role_idx ON users(role);

-- Enable Row Level Security
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- Allow users to read their own data
CREATE POLICY "Users can read their own data" ON users
  FOR SELECT USING (auth.uid() = id);

-- Allow users to read all users (for lead assignment)
CREATE POLICY "Users can read all users" ON users
  FOR SELECT USING (true);
```

### 3.2 Create "salespersons" Table (For Legacy Support)

```sql
CREATE TABLE IF NOT EXISTS salespersons (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  email TEXT NOT NULL UNIQUE,
  phone TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW())
);

-- Create index for faster queries
CREATE INDEX salespersons_name_idx ON salespersons(name);
CREATE INDEX salespersons_email_idx ON salespersons(email);

-- Enable Row Level Security
ALTER TABLE salespersons ENABLE ROW LEVEL SECURITY;

-- Allow public read access
CREATE POLICY "Allow public read access" ON salespersons
  FOR SELECT USING (true);

-- Allow admins to manage
CREATE POLICY "Allow admins to insert" ON salespersons
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Allow admins to update" ON salespersons
  FOR UPDATE USING (true);

CREATE POLICY "Allow admins to delete" ON salespersons
  FOR DELETE USING (true);
```

### 3.3 Create "leads" Table (If Not Exists)

```sql
CREATE TABLE IF NOT EXISTS leads (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT NOT NULL,
  company TEXT,
  status TEXT CHECK (status IN ('New', 'Not lifted', 'Not connected', 'Voice Message', 'Quotation sent', 'Site visit', 'Advance payment', 'Lead finished', 'Contacted')) DEFAULT 'New',
  assigned_to TEXT DEFAULT 'Unassigned',
  note1 TEXT,
  note2 TEXT,
  street_address TEXT,
  post_code TEXT,
  lead_status TEXT,
  electricity_bill TEXT,
  type_of_property TEXT,
  avg_monthly_bill TEXT,
  sheet_id TEXT DEFAULT '0',
  source TEXT DEFAULT 'manual',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW())
);

-- Create indexes
CREATE INDEX leads_created_at_idx ON leads(created_at DESC);
CREATE INDEX leads_assigned_to_idx ON leads(assigned_to);
CREATE INDEX leads_status_idx ON leads(status);
CREATE INDEX leads_sheet_id_idx ON leads(sheet_id);

-- Enable Row Level Security
ALTER TABLE leads ENABLE ROW LEVEL SECURITY;

-- Allow public read access
CREATE POLICY "Allow public read access" ON leads
  FOR SELECT USING (true);

-- Allow anyone to insert/update/delete (for development)
CREATE POLICY "Allow public write access" ON leads
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Allow public update" ON leads
  FOR UPDATE USING (true);

CREATE POLICY "Allow public delete" ON leads
  FOR DELETE USING (true);
```

## Step 4: Initialize Admin User

After creating the tables, you need to create an initial admin user. You have two options:

### Option A: Using Supabase Dashboard

1. Go to **Authentication > Users** in Supabase dashboard
2. Click "Add user"
3. Enter email: `admin@axisogreen.in`
4. Enter password: `admin2024`
5. Uncheck "Auto confirm user"
6. Click "Create user"
7. Go to SQL Editor and run:

```sql
INSERT INTO users (id, email, name, phone, role)
SELECT id, email, 'Admin User', '+91-0000000000', 'admin'
FROM auth.users
WHERE email = 'admin@axisogreen.in'
ON CONFLICT (email) DO NOTHING;
```

### Option B: Using the App

1. Once the server is running, you can create the first admin manually using the server API
2. Or wait until there's a signup flow implemented

## Step 5: User Management

### Creating Users (Admin Only)

Once logged in as admin, go to **Team Management** and:

1. Click "Add User"
2. Fill in Name, Email, Phone, Role
3. Set an initial password
4. Click "Create User"

The system will:

- Create a Supabase Auth account with the email/password
- Create a user profile in the users table
- The user can then login with their credentials

### Viewing Assigned Leads (Salesperson)

When a salesperson logs in:

1. They can see **All Leads** tab with leads assigned to their name
2. They can also see a **My Leads** tab showing only their assigned leads
3. They can update the status of their assigned leads
4. They cannot access Team Management (admin only)

### Changing User Password (Admin)

1. Go to **Team Management**
2. Click the key icon next to a user
3. Enter new password
4. Click "Update Password"

## Step 6: Authentication Flow

### Login

1. User visits `/login`
2. Enters email and password
3. System calls `supabase.auth.signInWithPassword()`
4. On success:
   - User profile is loaded from `users` table
   - User is stored in AuthContext
   - User is redirected to `/`

### Logout

1. User clicks "Logout" button in sidebar
2. System calls `supabase.auth.signOut()`
3. User is redirected to `/login`

### Protected Routes

- **`/`** (Dashboard) - Protected, accessible by all authenticated users
- **`/leads`** - Protected, accessible by all authenticated users (salespersons see assigned leads)
- **`/salespersons`** - Protected, accessible by admins only
- **`/settings`** - Protected, accessible by all authenticated users
- **`/login`** - Public, redirects to home if already logged in

## Step 7: Testing

### Test Admin Login

Email: `admin@axisogreen.in`
Password: `admin2024`

After login, admin should:

1. See Dashboard
2. See Leads page with all leads
3. See Team Management in sidebar
4. Be able to create, edit, and delete users

### Test Salesperson Login

Create a new salesperson user via Team Management, then:

1. Login with their credentials
2. Should NOT see Team Management in sidebar
3. Should see Leads page with "All Leads" and "My Leads" tabs
4. "My Leads" tab should show only leads assigned to them

## Step 8: Database Diagram

```
┌─────────────────────────────┐
│         users               │ (Linked to auth.users)
├─────────────────────────────┤
│ id (UUID, PK, FK)           │
│ email (TEXT, UNIQUE)        │
│ name (TEXT)                 │
│ phone (TEXT)                │
│ role (TEXT: admin|sales)    │
│ created_at (TIMESTAMP)      │
│ updated_at (TIMESTAMP)      │
└─────────────────────────────┘

┌─────────────────────────────┐
│       leads                 │
├─────────────────────────────┤
│ id (UUID, PK)               │
│ name (TEXT)                 │
│ email (TEXT)                │
│ phone (TEXT)                │
│ company (TEXT)              │
│ status (TEXT)               │
│ assigned_to (TEXT) ────────────────┐
│ note1 (TEXT)                │      │
│ note2 (TEXT)                │      │
│ street_address (TEXT)       │      │
│ post_code (TEXT)            │      │
│ ... (other fields)          │      │
│ created_at (TIMESTAMP)      │      │
│ updated_at (TIMESTAMP)      │      │
└─────────────────────────────┘      │
                                     │
┌─────────────────────────────┐      │
│    salespersons             │      │
├─────────────────────────────┤      │
│ id (UUID, PK)               │      │
│ name (TEXT, UNIQUE)◄────────┴──────┘
│ email (TEXT, UNIQUE)        │
│ phone (TEXT)                │
│ created_at (TIMESTAMP)      │
│ updated_at (TIMESTAMP)      │
└─────────────────────────────┘
```

## Troubleshooting

### Error: "Column 'users' does not exist"

**Solution**: Create the users table using Step 3.1 SQL

### Error: "Email already exists"

**Solution**: This email is already registered. Use a different email or delete the existing user first.

### Error: "Row Level Security (RLS) enabled"

**Solution**: Disable RLS or adjust policies. For development, you can disable with:

```sql
ALTER TABLE users DISABLE ROW LEVEL SECURITY;
ALTER TABLE leads DISABLE ROW LEVEL SECURITY;
ALTER TABLE salespersons DISABLE ROW LEVEL SECURITY;
```

### Salesperson can see Team Management

**Solution**: This shouldn't happen. Check that:

1. User role is set to 'salesperson' (not 'admin')
2. You're viewing the latest code (clear browser cache)
3. Logout and login again

### Can't create users via Team Management

**Solution**: Check that:

1. You're logged in as an admin
2. Server is running (check `/api/admin/create-user` endpoint)
3. Check browser console for error messages
4. Verify Supabase credentials are set correctly

## Environment Variables Required

```
VITE_SUPABASE_URL=<your-supabase-url>
VITE_SUPABASE_ANON_KEY=<your-supabase-anon-key>
```

## Files Modified/Created

- `client/lib/auth.ts` - Authentication functions
- `client/context/AuthContext.tsx` - Auth state management
- `client/pages/Salespersons.tsx` - Admin panel for user management
- `client/pages/Leads.tsx` - Added "My Leads" tab for salespersons
- `client/components/AdminRoute.tsx` - Protected route for admin-only pages
- `client/components/CRMLayout.tsx` - Updated nav items based on role
- `server/routes/admin-users.ts` - Server endpoints for user management
- `server/index.ts` - Registered admin routes

## Next Steps

1. Set environment variables for Supabase
2. Create database tables using the SQL provided
3. Create initial admin user
4. Test login/logout flow
5. Test user creation via Team Management
6. Test assigned leads view for salespersons

## Support

For issues or questions, refer to the troubleshooting section above or check:

- Supabase docs: https://supabase.com/docs
- Browser console for error messages
- Supabase dashboard logs
