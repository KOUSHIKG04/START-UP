# Historical schema placeholders

These empty files are not executed. The table source is
../../packages/database/src/schema. Generate reviewed SQL using
`pnpm db:generate`; Supabase CLI applies files from ../migrations.
Put custom RPC, trigger and RLS SQL directly in versioned migrations.
Do not maintain another schema or migration history here.
