# Auth and Profile Implementation Plan

## START
- Analyze existing dependencies (zod, jsonwebtoken, bcrypt?, express)
- Add missing dependencies (e.g. bcrypt for password hashing in server, maybe react-router-dom if not present in web)

## PLAN
- Define User schema in database (Mongoose) with fields: email, passwordHash, role, profile (name, phone, etc)
- Server Routes:
  - POST /api/auth/register
  - POST /api/auth/login
  - GET /api/auth/me (Profile retrieval)
  - PUT /api/auth/profile (Profile update)
  - GET /api/admin/users (Admin capabilities)
- Demo Mode:
  - POST /api/auth/demo (auto-login or token without credentials)
- Web UI:
  - Setup routing or state to show Auth pages before RoleGateway.
  - Login Component
  - Register Component
  - Profile Modal/Page
  - Admin Dashboard (for user management)
  - "Text Demo Mode" button on login screen.

## BUILD
- [ ] Install bcrypt on server
- [ ] Create `User` mongoose model.
- [ ] Create `auth.routes.ts` and `admin.routes.ts` in server.
- [ ] Update `apps/server/src/app.ts` to include new routes.
- [ ] Update `apps/web/src/App.tsx` with Auth state management.
- [ ] Create `AuthPage.tsx` with Login/Register forms.
- [ ] Implement Demo Mode button that calls Demo login and sets token.
- [ ] Build Profile maintenance component in Web.
- [ ] Build Admin capabilities (user list, change roles) in Web.

## VERIFY
- [ ] Run backend tests for auth routes.
- [ ] Test E2E login/register flow.
- [ ] Test Profile update.
- [ ] Test Demo mode.
- [ ] Test Admin capabilities.
