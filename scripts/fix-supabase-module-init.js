/**
 * Fixes module-level Supabase client initialization that causes Next.js build failures
 * when NEXT_PUBLIC_SUPABASE_URL is empty in Vercel's build environment.
 *
 * Replaces eager createClient() calls with a lazy Proxy that defers client creation
 * to the first runtime request, not module load time.
 */
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const ROOT = path.join(__dirname, '..');

// Find all files with module-level supabase = createClient
let files;
try {
  const output = execSync(
    'grep -rl "^const supabase = createClient" src/app/api/',
    { cwd: ROOT, encoding: 'utf-8' }
  ).trim();
  files = output.split('\n').filter(Boolean);
} catch {
  console.log('No files found with module-level supabase initialization.');
  process.exit(0);
}

const LAZY_PROXY = `let _supabase: ReturnType<typeof createClient> | null = null;
const supabase = new Proxy({} as object, {
  get(_: object, prop: string | symbol) {
    if (!_supabase) {
      _supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!
      );
    }
    return Reflect.get(_supabase, prop);
  },
}) as unknown as ReturnType<typeof createClient>;`;

let fixedCount = 0;

for (const relFile of files) {
  const file = path.join(ROOT, relFile);
  let content = fs.readFileSync(file, 'utf-8');
  const original = content;

  // Pattern 1: three separate variable declarations
  // const supabaseUrl = ...; const supabaseServiceKey = ...; const supabase = createClient(supabaseUrl, supabaseServiceKey);
  content = content.replace(
    /const supabaseUrl\s*=\s*process\.env\.NEXT_PUBLIC_SUPABASE_URL!;\s*\r?\nconst supabaseServiceKey\s*=\s*process\.env\.SUPABASE_SERVICE_ROLE_KEY!;\s*\r?\nconst supabase\s*=\s*createClient\([^)]+\);/g,
    LAZY_PROXY
  );

  // Pattern 2: inline multi-line — const supabase = createClient(\n  ...,\n  ...\n);
  // Handles any combination of args spanning up to ~5 lines
  content = content.replace(
    /^const supabase\s*=\s*createClient\([\s\S]*?\);$/gm,
    () => {
      // Only replace if it's the module-level init (no indentation = column 0)
      return LAZY_PROXY;
    }
  );

  // Pattern 3: single-line — const supabase = createClient(url, key);
  content = content.replace(
    /^const supabase\s*=\s*createClient\(.+\);$/gm,
    LAZY_PROXY
  );

  if (content !== original) {
    fs.writeFileSync(file, content, 'utf-8');
    fixedCount++;
    console.log('✓ Fixed:', relFile);
  } else {
    console.log('⚠ No match found:', relFile);
  }
}

console.log(`\nDone. Fixed ${fixedCount} / ${files.length} files.`);
