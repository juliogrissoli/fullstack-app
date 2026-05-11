#!/usr/bin/env node
/**
 * Fix Supabase Proxy typing: ReturnType<typeof createClient> → SupabaseClient<any>
 * This eliminates `never` type errors caused by SupabaseClient<unknown> resolving
 * all table rows to `never` through Supabase's conditional types.
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const ROOT = path.join(__dirname, '..');

// Find all files with the broken typing
function findFiles() {
  try {
    const result1 = execSync(
      'grep -rl "as ReturnType<typeof createClient>" --include="*.ts" --include="*.tsx" .',
      { cwd: ROOT, encoding: 'utf-8' }
    ).trim();
    const result2 = execSync(
      'grep -rl "as unknown as ReturnType<typeof createClient>" --include="*.ts" --include="*.tsx" .',
      { cwd: ROOT, encoding: 'utf-8' }
    ).trim();
    const files = new Set([
      ...result1.split('\n').filter(Boolean),
      ...result2.split('\n').filter(Boolean)
    ]);
    return [...files];
  } catch (e) {
    return [];
  }
}

function fixFile(relPath) {
  const filePath = path.join(ROOT, relPath);
  let content = fs.readFileSync(filePath, 'utf-8');
  const original = content;

  // 1. Fix the cast (both variants)
  content = content.replace(/\}\) as unknown as ReturnType<typeof createClient>/g, '}) as SupabaseClient<any>');
  content = content.replace(/\}\) as ReturnType<typeof createClient>/g, '}) as SupabaseClient<any>');

  // 2. Ensure SupabaseClient is imported alongside createClient
  // Pattern: import { createClient } from '@supabase/supabase-js'
  // or:       import { createClient, SupabaseClient } from '@supabase/supabase-js'
  content = content.replace(
    /import \{([^}]*)\} from ['"]@supabase\/supabase-js['"]/g,
    (match, imports) => {
      const parts = imports.split(',').map(s => s.trim()).filter(Boolean);
      if (!parts.includes('SupabaseClient')) {
        parts.push('SupabaseClient');
      }
      return `import { ${parts.join(', ')} } from '@supabase/supabase-js'`;
    }
  );

  if (content !== original) {
    fs.writeFileSync(filePath, content, 'utf-8');
    return true;
  }
  return false;
}

const files = findFiles();
console.log(`Found ${files.length} files to fix.`);
let fixed = 0;
for (const f of files) {
  if (fixFile(f)) {
    console.log(`  ✓ ${f}`);
    fixed++;
  } else {
    console.log(`  - ${f} (no changes)`);
  }
}
console.log(`\nDone. Fixed ${fixed}/${files.length} files.`);
