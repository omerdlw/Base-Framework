# Base Framework Agent Guidelines & Design System Rules

These rules are STRICT and MANDATORY for all AI assistants and developers modifying this codebase. Always adhere to these rules without exception.

---

## 1. Typography Scale Rules

- **NEVER use arbitrary pixel or rem font sizes** such as `text-[9px]`, `text-[10px]`, `text-[11px]`, `text-[12px]`, `text-[13px]`, `text-[14px]`, `text-[15px]`, `text-[16px]`, `text-[19px]`, `text-[1.02rem]`, etc.
- **Always use standard Tailwind typography scale variants:**
  - `text-xs` (12px): Badges, chips, tags, timestamps, uppercase labels, counts, small button labels.
  - `text-sm` (14px): Secondary descriptions, list item details, standard button labels, form inputs.
  - `text-base` (16px): Main body text, primary card titles, section subtitles.
  - `text-lg`, `text-xl`, `text-2xl`, `text-3xl`, `text-4xl`, `text-5xl`: Headings, modal titles, page hero titles.

---

## 2. Letter Spacing (Tracking) Rules

- **NEVER use any `tracking-*` classes** (`tracking-tight`, `tracking-wide`, `tracking-wider`, `tracking-widest`, `tracking-[...]`, etc.).
- Letter spacing is managed globally in font definitions and must NEVER be overridden with utility classes.

---

## 3. UI Primitives & Image Components

- **Form & Interactive Elements:** NEVER use raw HTML `<button>`, `<input>`, `<textarea>`, `<select>`. Always import and use from `@/core/primitives`:
  - `import { Button, Input, Textarea, Tooltip, Icon } from "@/core/primitives";`
- **Images:** NEVER use raw HTML `<img>` or `next/image` `<Image>`. Always import and use from `@/core/primitives`:
  - `import { AdaptiveImage, BackdropHero } from "@/core/primitives";`

---

## 4. Copywriting & Punctuation Rules

- **NEVER use trailing periods (`.`) in sentences displayed to the user or developer:**
  - UI labels, descriptions, subtitles, empty states, placeholders, tooltips, dialogs, badges, and notification toasts must NEVER end with a period.
  - Developer-facing logs, warnings, and thrown error messages must NEVER end with a period.
  - *Example:* `This title is not currently available to stream, rent, or buy on digital platforms` (NOT `...platforms.`)
