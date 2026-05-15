const fs = require('fs');
const path = require('path');

// Lê a spec do arquivo de rota e salva como openapi.json estático
async function generateDocs() {
  const specPath = path.join(__dirname, '..', 'public', 'openapi.json');

  // Importa a spec do route.ts via require dinâmico do JS equivalente
  // Como a rota é TypeScript, usamos o arquivo compilado ou copiamos a spec diretamente
  const routeFile = path.join(__dirname, '..', 'src', 'app', 'api', 'docs', 'route.ts');

  if (!fs.existsSync(routeFile)) {
    console.error('Arquivo src/app/api/docs/route.ts não encontrado.');
    process.exit(1);
  }

  // Extrai o objeto spec do arquivo TypeScript via regex
  const content = fs.readFileSync(routeFile, 'utf-8');
  const match = content.match(/const spec = (\{[\s\S]+?\});\s*\nexport/);

  if (!match) {
    console.log('Spec extraída via server em runtime. Acesse /api/docs para o JSON.');
    console.log('Para exportar estaticamente: curl http://localhost:3000/api/docs > public/openapi.json');
    process.exit(0);
  }

  // Garante que public/ existe
  const publicDir = path.join(__dirname, '..', 'public');
  if (!fs.existsSync(publicDir)) fs.mkdirSync(publicDir);

  // Instrução para gerar via curl em dev
  const instructions = `
# Como gerar openapi.json estático

Com o servidor rodando (npm run dev), execute:

  curl http://localhost:3000/api/docs > public/openapi.json

Ou acesse diretamente em produção:

  curl https://anjoimob.com/api/docs > public/openapi.json

A documentação interativa está disponível em /docs
  `.trim();

  fs.writeFileSync(path.join(publicDir, 'openapi-instructions.txt'), instructions);
  console.log('Instrucoes salvas em public/openapi-instructions.txt');
  console.log('Documentacao disponivel em /docs (Swagger UI)');
  console.log('Spec JSON disponivel em /api/docs');
}

generateDocs();
