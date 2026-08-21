const fs = require('fs');

// 1. Fix auth.ts
let authFile = 'artifacts/api-server/src/routes/auth.ts';
let authContent = fs.readFileSync(authFile, 'utf8');
authContent = authContent.replace(
  'req.body.displayName ?? "Kirti"',
  'req.body.displayName ?? ""'
);
fs.writeFileSync(authFile, authContent);

// 2. Fix migration
let migFile = 'supabase/migrations/20260819000000_sita_full_schema.sql';
let migContent = fs.readFileSync(migFile, 'utf8');
migContent = migContent.replace(
  "display_name text not null default 'Tanvi'",
  "display_name text not null default ''"
);
migContent = migContent.replace(
  "coalesce(new.raw_user_meta_data->>'display_name', 'Tanvi')",
  "coalesce(new.raw_user_meta_data->>'display_name', '')"
);
fs.writeFileSync(migFile, migContent);

