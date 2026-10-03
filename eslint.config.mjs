import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";

const BANNED_LEGACY_PATHS = [
  "@/core",
  "@/core/**",
  "@/modules",
  "@/modules/**",
];

function restrictImports({ files, ban = [], deep = [], message, pure = false }) {
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
              message: "Pure server files must not import React.",
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
                      "Import through the entry points (@omerdlw/base-framework/kernel, @omerdlw/base-framework/modules/dock, ...), not deep paths.",
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
      files: ["src/**/*.{ts,tsx}"],
      ban: BANNED_LEGACY_PATHS,
      message:
        "Legacy @/core and @/modules paths are removed. Import from @omerdlw/base-framework instead.",
    },
    {
      files: ["src/features/**"],
      ban: ["@/app", "@/app/**"],
      message: "Features cannot depend on the app layer.",
    },
    {
      files: ["src/infrastructure/**"],
      ban: [
        "@/app",
        "@/app/**",
        "@/features",
        "@/features/**",
      ],
      message:
        "Infrastructure adapters cannot depend on features or the app layer.",
    },
    {
      files: ["src/config/**"],
      ban: ["@/app", "@/app/**"],
      message: "Theme configuration cannot depend on the app layer.",
    },
  ].map(restrictImports),
  {
    files: ["src/**/*.{js,jsx,ts,tsx}"],
    rules: {
      "no-restricted-syntax": [
        "error",
        {
          selector:
            "Literal[value=/(^|\\s)-?z-(\\[[^\\]]*\\]|[3-9]\\d|\\d{3,})(\\s|$)/]",
          message:
            "Use Z_INDEX from @omerdlw/base-framework/tokens for layers (z-0/10/20 are fine for local stacking).",
        },
        {
          selector:
            "TemplateElement[value.raw=/(^|\\s)-?z-(\\[[^\\]]*\\]|[3-9]\\d|\\d{3,})(\\s|$)/]",
          message:
            "Use Z_INDEX from @omerdlw/base-framework/tokens for layers (z-0/10/20 are fine for local stacking).",
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
            "Use Z_INDEX from @omerdlw/base-framework/tokens instead of a literal zIndex.",
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
