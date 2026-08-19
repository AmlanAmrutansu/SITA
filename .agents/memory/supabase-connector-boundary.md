---
name: Supabase connector boundary
description: Durable security and architecture rule for the connected Supabase integration.
---

Supabase is accessed through the Replit connector proxy from the API server. Do not put connector credentials or Supabase service keys in Vite client code; use HTTP-only application cookies for the Supabase access and refresh tokens and enforce ownership with RLS.

**Why:** The connected integration provisions the project key through the server proxy, while browser access would expose credentials and bypass the intended identity boundary.

**How to apply:** Add new persistence through authenticated API routes, pass the access token as a bearer token to Supabase REST calls, and keep every user-owned table protected by `auth.uid()` policies.