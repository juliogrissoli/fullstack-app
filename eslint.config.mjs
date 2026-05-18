import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,

  globalIgnores([
    ".next/**",
    ".vercel/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    // Scripts de teste/stress não são código de produção
    "src/scripts/**",
  ]),

  // Regras personalizadas para o projeto
  {
    rules: {
      // Rotas de API usam `any` legitimamente para respostas dinâmicas do Supabase.
      // Rebaixar de error para warn evita 600+ falsos-positivos sem perder visibilidade.
      "@typescript-eslint/no-explicit-any": "warn",

      // require() está proibido — use import ES6. Exceção: arquivos de config Node.js.
      "@typescript-eslint/no-require-imports": "error",

      // Variáveis não usadas com prefixo _ são intencionalmente ignoradas.
      "@typescript-eslint/no-unused-vars": [
        "warn",
        { argsIgnorePattern: "^_", varsIgnorePattern: "^_" },
      ],

      // Permite console.log/warn/error em rotas de API server-side.
      "no-console": "off",
    },
  },
]);

export default eslintConfig;
