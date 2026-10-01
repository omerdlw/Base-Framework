import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";

const OUTER = [
  "@/app",
  "@/app/**",
  "@/features",
  "@/features/**",
  "@/infrastructure",
  "@/infrastructure/**",
  "@/modules",
  "@/modules/**",
];
const OUTER_NO_MODULES = OUTER.filter(
  (group) => !group.startsWith("@/modules"),
);
const CORE_CLIENT = [
  "@/core/kernel",
  "@/core/hooks",
  "@/core/primitives",
  "@/core/error",
  "@/core/provider",
  "@/core/theme",
];

function restrictImports({ files, ban, deep = [], message, pure = false }) {
  return {
    files: files.flatMap((glob) =>
      glob.endsWith("/**") ? [`${glob}/*.{ts,tsx}`] : [glob],
    ),
    rules: {
      "no-restricted-imports": [
        "error",
        {
          ...(pure && {
            paths: ["react", "react-dom"].map((name) => ({
              name,
              message: "Server-safe core entries must not import React.",
            })),
          }),
          patterns: [
            ...(pure ? [{ group: ["next/*"], message }] : []),
            ...(ban.length > 0 ? [{ group: ban, message }] : []),
            ...(deep.length > 0
              ? [
                  {
                    group: deep,
                    message:
                      "Import through the entry points (@/core/kernel, @/modules/dock, ...), not deep paths.",
                  },
                ]
              : []),
          ],
        },
      ],
    },
  };
}

const eslintConfig = defineConfig([
  ...nextVitals,
  {
    rules: {
      "@next/next/no-img-element": "off",
    },
  },
  ...[
    {
      files: ["src/core/utils/**"],
      ban: [...OUTER, ...CORE_CLIENT, "@/core/tokens"],
      pure: true,
      message:
        "utils is the bottom of core: it imports nothing from other layers, React or Next.js.",
    },
    {
      files: ["src/core/tokens/**", "src/core/result.ts", "src/core/events.ts"],
      ban: [...OUTER, ...CORE_CLIENT],
      pure: true,
      message:
        "Server-safe core entries cannot import client layers, React or Next.js.",
    },
    {
      files: ["src/core/hooks/**"],
      ban: [
        ...OUTER,
        "@/core/primitives",
        "@/core/kernel",
        "@/core/error",
        "@/core/provider",
      ],
      message:
        "Core hooks sit below primitives, the kernel and error boundaries.",
    },
    {
      files: ["src/core/primitives/**"],
      ban: [...OUTER, "@/core/kernel", "@/core/error", "@/core/provider"],
      message: "Primitives sit below the kernel and error boundaries.",
    },
    {
      files: ["src/core/kernel/**"],
      ban: [...OUTER, "@/core/primitives", "@/core/error", "@/core/provider"],
      message: "The kernel imports only hooks, utils, tokens and events.",
    },
    {
      files: ["src/core/error/**"],
      ban: [...OUTER, "@/core/kernel", "@/core/provider"],
      message: "Error boundaries sit below the kernel and CoreProvider.",
    },
    {
      files: ["src/core/provider.tsx"],
      ban: [...OUTER],
      message:
        "Core cannot depend on app, features, infrastructure or modules.",
    },
    {
      files: ["src/modules/**"],
      ban: [...OUTER_NO_MODULES, "@/modules", "@/modules/**"],
      deep: ["@/core/*/*"],
      message:
        "A module cannot import features, app, infrastructure or another module (use useModule / definePeer for peers).",
    },
    {
      files: ["src/features/**", "src/app/**"],
      ban: [],
      deep: ["@/core/*/*", "@/modules/*/*"],
      message: "Import through the entry points, not deep paths.",
    },
    {
      files: ["src/features/**"],
      ban: ["@/app", "@/app/**"],
      deep: ["@/core/*/*", "@/modules/*/*"],
      message: "Features cannot depend on the app layer.",
    },
    {
      files: ["src/infrastructure/**"],
      ban: [
        "@/app",
        "@/app/**",
        "@/features",
        "@/features/**",
        "@/modules",
        "@/modules/**",
        ...CORE_CLIENT,
      ],
      message:
        "Infrastructure may only import Core's pure entries (utils, events, result, tokens).",
    },
  ].map(restrictImports),
  {
    files: ["src/core/**/*.{ts,tsx}", "src/modules/**/*.{ts,tsx}"],
    rules: { "@typescript-eslint/no-explicit-any": "error" },
  },
  {
    files: ["src/**/*.{js,jsx,ts,tsx}"],
    ignores: [
      "src/core/tokens/**",
      "src/modules/*/motion.ts",
      "src/modules/*/motion/**",
    ],
    rules: {
      "no-restricted-syntax": [
        "error",
        {
          selector:
            "Literal[value=/(^|\\s)-?z-(\\[[^\\]]*\\]|[3-9]\\d|\\d{3,})(\\s|$)/]",
          message:
            "Use Z_INDEX from @/core/tokens for layers (z-0/10/20 are fine for local stacking).",
        },
        {
          selector:
            "TemplateElement[value.raw=/(^|\\s)-?z-(\\[[^\\]]*\\]|[3-9]\\d|\\d{3,})(\\s|$)/]",
          message:
            "Use Z_INDEX from @/core/tokens for layers (z-0/10/20 are fine for local stacking).",
        },
        {
          selector:
            "Literal[value=/(^|[\\s:])((duration|delay)-[0-9]+|ease-(in|out|in-out))(\\s|$)/]",
          message:
            "Use the motion token classes (duration-fast, ease-out-quart…) from globals.css instead of raw Tailwind timing.",
        },
        {
          selector:
            "TemplateElement[value.raw=/(^|[\\s:])((duration|delay)-[0-9]+|ease-(in|out|in-out))(\\s|$)/]",
          message:
            "Use the motion token classes (duration-fast, ease-out-quart…) from globals.css instead of raw Tailwind timing.",
        },
        {
          selector: "Property[key.name='zIndex'][value.type='Literal']",
          message:
            "Use Z_INDEX from @/core/tokens instead of a literal zIndex.",
        },
        {
          selector:
            "Property[key.name='transition'] > ObjectExpression > Property[key.name=/^(duration|delay|ease)$/][value.type=/^(Literal|ArrayExpression)$/]",
          message:
            "Use motion tokens from @/core/tokens (or a module motion preset) instead of inline timing.",
        },
        {
          selector:
            "JSXAttribute[name.name='transition'] ObjectExpression > Property[key.name=/^(duration|delay|ease)$/][value.type=/^(Literal|ArrayExpression)$/]",
          message:
            "Use motion tokens from @/core/tokens (or a module motion preset) instead of inline timing.",
        },
      ],
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
