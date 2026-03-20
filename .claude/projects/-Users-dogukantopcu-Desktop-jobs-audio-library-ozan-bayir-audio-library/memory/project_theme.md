---
name: Theme - white/light
description: Both web and admin use a white/light theme with zinc-based colors
type: project
---

Both apps (web and admin) use a **white/light theme**.

Color tokens:
- background: #ffffff
- foreground: #09090b
- primary: #18181b (dark buttons/accents)
- primary-foreground: #fafafa
- muted: #f4f4f5
- muted-foreground: #71717a
- border: #e4e4e7
- destructive: #ef4444
- success: #16a34a

**Why:** User requested theme change from the original dark/black theme to white.
**How to apply:** Use Tailwind semantic classes like bg-background, text-foreground, bg-primary, text-muted-foreground etc. Do not hardcode hex colors from the old dark palette (#000, #0a0a0a, #222).
