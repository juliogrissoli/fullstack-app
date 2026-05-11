const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const ROOT = path.join(__dirname, '..');

const files = execSync(
  'grep -rl "new Proxy.*ReturnType.*createClient" src/app/api/',
  { cwd: ROOT, encoding: 'utf-8' }
).trim().split('\n').filter(Boolean);

const OLD = `const supabase: ReturnType<typeof createClient> = new Proxy({} as ReturnType<typeof createClient>, {`;
const NEW = `const supabase = new Proxy({} as object, {`;
const OLD_CLOSE = `});`;
const NEW_CLOSE = `}) as unknown as ReturnType<typeof createClient>;`;

let fixed = 0;
for (const rel of files) {
  const file = path.join(ROOT, rel);
  let content = fs.readFileSync(file, 'utf-8');
  const original = content;

  // Fix the opening line
  content = content.replace(OLD, NEW);

  // Fix the closing — only the standalone }); that ends the proxy block
  // The block ends with: \n});\n — replace only once per file
  const proxyCloseRe = /\}\)\;(\s*\nexport async function|\s*\nexport function|\s*\n\/\*|\s*\ninterface|\s*\ntype |\s*\nconst [^s])/;
  if (content.includes(NEW) && content.includes(OLD_CLOSE)) {
    // Replace first occurrence of standalone }); after the proxy
    content = content.replace(
      /^(\}\)\;)$/m,
      `}) as unknown as ReturnType<typeof createClient>;`
    );
  }

  if (content !== original) {
    fs.writeFileSync(file, content, 'utf-8');
    fixed++;
    console.log('✓', rel);
  } else {
    console.log('⚠ unchanged:', rel);
  }
}

console.log(`\nFixed ${fixed}/${files.length}`);
