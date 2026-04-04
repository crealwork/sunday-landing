# Sunday (Sundayable) — Brand Design Guidelines

> AI-powered sales admin for Realtors. Premium, editorial, human-first.

## Brand Identity

- **Product name**: Sunday
- **Domain**: sundayable.com
- **Persona**: Female AI sales admin — professional, warm, efficient
- **Tagline**: "She turns dead leads into booked showings."
- **Voice**: Direct, confident, no jargon. Speaks like a sharp colleague, not a chatbot.

## Color Palette

| Token     | Hex       | Usage                              |
|-----------|-----------|------------------------------------|
| `ink`     | `#0A0A0A` | Primary text, dark backgrounds     |
| `paper`   | `#FFFFFF` | Page background                    |
| `muted`   | `#6B6B6B` | Secondary text, descriptions       |
| `divider` | `#E5E5E5` | Borders, separators                |
| `surface` | `#F5F5F5` | Card backgrounds, sections         |
| `hover`   | `#F0F0F0` | Interactive hover states           |
| `accent`  | `#800020` | CTA buttons, highlights, burgundy  |

### Extended Palette (Contextual)

| Context       | Hex       | Usage                              |
|---------------|-----------|------------------------------------|
| iMessage blue | `#007AFF` | iMessage sent bubble (demo only)   |
| iMessage gray | `#E9E9EB` | iMessage received bubble           |
| SMS green     | `#34C759` | SMS sent bubble, send button       |
| Gmail text    | `#3C4043` | Gmail body text (demo only)        |
| Gmail meta    | `#5F6368` | Gmail labels, timestamps           |
| Gmail header  | `#202124` | Gmail subject, sender name         |
| Gmail border  | `#E8EAED` | Gmail dividers                     |

### Selection

```css
::selection { background: #0A0A0A; color: white; }
```

## Typography

### Font Stack

| Role     | Family                                    | Fallback              |
|----------|-------------------------------------------|-----------------------|
| Heading  | `"Instrument Serif"`                      | Georgia, serif        |
| Body     | `Inter`                                   | system-ui, sans-serif |

**Google Fonts import:**
```
Instrument Serif:ital@0;1 + Inter:wght@300;400;500;600;700;800;900
```

### Hierarchy

| Element         | Size                     | Weight   | Letter-spacing | Line-height |
|-----------------|--------------------------|----------|----------------|-------------|
| H1 (hero)       | 6xl / 7xl / 8xl (responsive) | normal   | `0.02em`       | `0.9`       |
| H2 (section)    | 4xl / 5xl / 6xl / 7xl   | normal   | `0.015em`      | `1.05`      |
| Section label   | xs (12px)                | 600      | `4px`          | —           |
| Body            | base (16px) / lg (18px)  | 400      | normal         | `relaxed`   |
| Body strong     | base / lg                | 600–700  | normal         | —           |
| Small / meta    | sm (14px) / xs (12px)    | 400–500  | normal         | —           |

### Section Labels

Uppercase, extra-wide tracking, muted color:
```html
<p class="text-muted text-xs font-semibold tracking-[4px] uppercase mb-5">The Reality</p>
```

## Layout

### Container

- Max width: `max-w-6xl` (hero), `max-w-3xl` (content sections)
- Horizontal padding: `px-6`
- Section vertical padding: `py-24`

### Grid Patterns

- **2-column split**: `md:flex gap-12` (demo + explanation)
- **2-column cards**: `grid grid-cols-2 gap-4`
- **Stat cards**: `grid grid-cols-2 gap-3` inside content
- **Feature list**: Vertical stack with `space-y-8`, icon + text pairs

### Spacing Scale

| Context              | Value          |
|----------------------|----------------|
| Section padding      | `py-24 px-6`   |
| Card padding         | `p-6`          |
| Stat card padding    | `p-4`          |
| Between sections     | Divider line   |
| Content gap (split)  | `gap-12`       |
| Card gap             | `gap-4`        |
| Stack items          | `space-y-4`    |

## Components

### Cards

```css
/* Base card */
background: #F5F5F5;        /* surface */
border-radius: 16px;        /* rounded-2xl */
padding: 24px;              /* p-6 */

/* Dark card (emphasis) */
background: #0A0A0A;        /* ink */
color: white;
border-radius: 16px;
padding: 24px;
```

### Card Hover

```css
.card-hover {
  transition: transform 0.2s ease, box-shadow 0.2s ease;
}
.card-hover:hover {
  transform: translateY(-2px);
  box-shadow: 0 8px 30px rgba(0, 0, 0, 0.08);
}
```

### Buttons

**Primary CTA:**
```css
background: #800020;        /* accent */
color: white;
font-weight: 600;
font-size: 14px;
padding: 12px 28px;         /* py-3 px-7 */
border-radius: 6px;         /* rounded-md */
/* hover */
background: rgba(128, 0, 32, 0.85);
transition: background 0.2s;
```

**Text link:**
```css
color: rgba(255, 255, 255, 0.5);  /* or text-muted */
font-weight: 500;
font-size: 14px;
text-decoration: underline;
text-underline-offset: 4px;
text-decoration-color: rgba(255, 255, 255, 0.2);
/* hover */
color: rgba(255, 255, 255, 0.8);
text-decoration-color: rgba(255, 255, 255, 0.5);
```

### Pill Toggles

```css
/* Container */
background: #F5F5F5;        /* or white with border */
border-radius: 9999px;      /* rounded-full */
padding: 4px;

/* Active tab */
background: #0A0A0A;
color: white;
border-radius: 9999px;
padding: 8px 20px;
font-weight: 600;
font-size: 14px;

/* Inactive tab */
color: #6B6B6B;
background: transparent;
```

### Pill Tags (Inline)

```css
border: 1px solid #E5E5E5;
border-radius: 9999px;
padding: 8px 16px;
font-size: 14px;
font-weight: 500;
color: #6B6B6B;
/* with inline SVG icon, gap: 8px */
```

### Icon Boxes

```css
width: 40px;
height: 40px;
background: #0A0A0A;
border-radius: 12px;         /* rounded-xl */
/* centered white stroke icon, 20x20 */
```

### Section Divider

```html
<div class="max-w-3xl mx-auto px-6">
  <div class="border-t border-divider"></div>
</div>
```

## Animation & Motion

### Fade In (on load / scroll)

```css
@keyframes fadeIn {
  from { opacity: 0; transform: translateY(12px); }
  to   { opacity: 1; transform: translateY(0); }
}
.fade-in { animation: fadeIn 0.6s ease both; }
```

### Transitions

| Element        | Property              | Duration | Easing |
|----------------|-----------------------|----------|--------|
| Card hover     | transform, box-shadow | 0.2s     | ease   |
| Tab content    | opacity               | 0.25s    | ease   |
| Heading verb   | opacity               | 0.2s     | ease   |
| Button hover   | background            | 0.15s    | ease   |
| Scroll         | smooth                | —        | —      |

### Auto-Rotate

Tab sections (email/SMS, how-it-works) auto-rotate every **4 seconds**.

## Responsive Behavior

| Breakpoint | Behavior                                           |
|------------|----------------------------------------------------|
| Mobile     | Single column, centered text, stacked layout       |
| `sm:`      | Side-by-side CTAs, larger hero text (7xl)          |
| `md:`      | Two-column splits (demo + explanation), 6xl titles |
| `lg:`      | Full layout with left-aligned hero, 8xl hero text  |

## Favicon

SVG circle with serif "S":
```svg
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32">
  <circle cx="16" cy="16" r="16" fill="#0A0A0A"/>
  <text x="16" y="22" text-anchor="middle" font-family="Georgia, serif"
        font-size="20" font-weight="bold" fill="#FFFFFF">S</text>
</svg>
```

## Hero Section

- Full viewport height (`min-h-screen`)
- Dark background (`bg-ink`) with white text
- Two-column on desktop: copy left, phone mockup right
- Subtle accent glow behind phone: `bg-accent/5 blur-3xl`

## OG / Social

- Title: "Meet Sunday. She turns dead leads into booked showings."
- Description: "Forward a lead, get a booked showing. Sunday handles all follow-up via text and email. No app required."
- Image: `og-image.png` at `https://www.sundayable.com/og-image.png`

## Design Principles

1. **Editorial luxury** — Serif headings + sans-serif body creates magazine-quality feel
2. **Show, don't tell** — iMessage and Gmail mockups demonstrate the product in context
3. **Restraint** — Single accent color, generous whitespace, minimal shadows
4. **Human-first AI** — Sunday has a name, a phone number, an email — she's a colleague, not software
5. **Zero-friction** — No app, no dashboard, no login. The UI *is* text and email.
