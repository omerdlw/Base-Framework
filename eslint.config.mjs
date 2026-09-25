import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";

const eslintConfig = defineConfig([
  ...nextVitals,
  {
    rules: {
      "@next/next/no-img-element": "off",
    },
  },
  {
    files: ["src/core/**/*.{js,jsx,ts,tsx}"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            {
              group: ["@/app/**", "@/features/**"],
              message:
                "Core cannot depend on app composition or feature domains.",
            },
          ],
        },
      ],
    },
  },
  {
    files: [
      "src/core/modules/background/provider.{js,jsx,ts,tsx}",
      "src/core/modules/context-menu/index.{js,jsx,ts,tsx}",
      "src/core/modules/controls/index.{js,jsx,ts,tsx}",
      "src/core/modules/loading/provider.{js,jsx,ts,tsx}",
      "src/core/modules/modal/index.{js,jsx,ts,tsx}",
      "src/core/modules/dock/{behavior,index,layout,provider,surface,surface-flow,surface-machine,guards,attention}.{js,jsx,ts,tsx}",
      "src/core/modules/notification/{index,provider}.{js,jsx,ts,tsx}",
      "src/core/primitives/fullscreen-state.{js,jsx,ts,tsx}",
    ],
    rules: {
      "react-hooks/set-state-in-effect": "off",
    },
  },
  {
    files: [
      "src/core/modules/dock/{layout,provider,surface,surface-machine,guards,attention}.{js,jsx,ts,tsx}",
      "src/core/orchestration/{hooks,provider}.{js,jsx,ts,tsx}",
    ],
    rules: {
      "react-hooks/refs": "off",
    },
  },
  {
    files: [
      "src/core/modules/dock/{status,surface,surface-flow,surface-machine,guards}.{js,jsx,ts,tsx}",
    ],
    rules: {
      "react-hooks/exhaustive-deps": "off",
    },
  },
  {
    files: [
      "src/core/modules/dock/{surface,surface-flow,surface-machine}.{js,jsx,ts,tsx}",
    ],
    rules: {
      "react-hooks/purity": "off",
    },
  },
  {
    files: ["src/core/modules/modal/index.{js,jsx,ts,tsx}"],
    rules: {
      "react-hooks/static-components": "off",
    },
  },
  globalIgnores([
    ".next/**",
    "out/**",
    "build/**",
    ".open-next/**",
    ".wrangler/**",
    "cloudflare-env.d.ts",
    "next-env.d.ts",
    "supabase/**",
  ]),
]);

export default eslintConfig;
