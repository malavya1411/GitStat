# Design System: The Editorial Flow

## 1. Overview & Creative North Star
**Creative North Star: The Digital Curator**
This design system moves away from the rigid, sterile grids of traditional SaaS dashboards toward a "High-End Editorial" experience. It treats data and UI not as elements to be boxed in, but as content to be curated within a tactile, premium environment. 

The aesthetic is defined by **Organic Sophistication**. We achieve this by breaking the "template" look through intentional asymmetry (e.g., varying card widths), overlapping illustrative elements, and a high-contrast typography scale that pairs an authoritative serif with a functional geometric sans-serif. The goal is to make the user feel they are interacting with a bespoke digital publication rather than a software tool.

---

## 2. Colors
Our palette is anchored in warmth. It avoids the clinical "tech blue" and "stark white" in favor of tonal depth and soft, purposeful accents.

### The Color Tokens
*   **Background:** `#fbfbe2` (A rich, warm cream)
*   **Primary (Lavender):** `#5c5d6e` / **Primary Container:** `#e6e6fa`
*   **Surface Tiers:**
    *   `surface_container_lowest`: `#ffffff` (Pure white for high-priority floating elements)
    *   `surface_container_low`: `#f5f5dc` (Standard surface for cards)
    *   `surface_container`: `#efefd7` (Nested sections)
    *   `surface_dim`: `#dbdcc3` (Deep tonal shifts for sidebars)

### Core Color Principles
*   **The "No-Line" Rule:** 1px solid borders are strictly prohibited for sectioning. Boundaries must be defined solely through background color shifts. For example, a `surface_container_low` card should sit on a `surface` background without any stroke.
*   **Surface Hierarchy & Nesting:** Treat the UI as a series of physical layers. A sidebar might use `surface_dim`, while the main stage uses `surface`. Within that stage, cards use `surface_container_low`. This creates depth without visual clutter.
*   **The "Glass & Gradient" Rule:** For floating elements or top-tier CTAs, use Glassmorphism. Apply `surface_container_lowest` with 70% opacity and a `20px` backdrop-blur. 
*   **Signature Textures:** Use subtle linear gradients on primary action buttons, transitioning from `primary` (#5c5d6e) to `primary_container` (#e6e6fa) at a 15% opacity overlay to give buttons a "pressed paper" or "satin" feel.

---

## 3. Typography
The system relies on a high-contrast pairing: **Newsreader** (Serif) for authority and elegance, and **Manrope** (Sans-Serif) for clarity and modern utility.

*   **Display & Headlines (Newsreader):** Used for branding, page titles, and high-level data summaries.
    *   `display-lg`: 3.5rem (For hero moments)
    *   `headline-md`: 1.75rem (Standard page headers)
*   **Titles & Body (Manrope):** Used for UI labels, navigation, and secondary data.
    *   `title-md`: 1.125rem (Card titles)
    *   `body-md`: 0.875rem (General interface text)
*   **Editorial Intent:** Set Headline tracking to `-0.02em` for a tighter, premium feel. Use `label-sm` (0.6875rem) in all-caps with `0.05em` letter spacing for data metadata to create an "archival" look.

---

## 4. Elevation & Depth
In this system, depth is communicated through light and tone, never through heavy shadows or structural lines.

*   **The Layering Principle:** Stacking color tokens creates natural lift. A card using `surface_container_lowest` (#ffffff) on a `surface` background (#fbfbe2) provides immediate hierarchy.
*   **Ambient Shadows:** For "floating" elements (like the 'Back to Search' button), use an extra-diffused shadow:
    *   `box-shadow: 0 12px 32px rgba(27, 29, 14, 0.06);` (Note the tint: the shadow uses a transparent version of the `on_surface` color).
*   **The "Ghost Border":** If accessibility requires a container boundary, use the `outline_variant` (#c7c5cc) at 20% opacity. It should be felt, not seen.
*   **Roundedness Scale:**
    *   **Large (xl: 1.5rem):** Main content containers and sidebars.
    *   **Medium (md: 0.75rem):** Internal cards and primary buttons.
    *   **Small (sm: 0.25rem):** Tooltips and small utility inputs.

---

## 5. Components

### Buttons
*   **Primary:** Lavender `primary_container` (#e6e6fa) with `primary` (#5c5d6e) text. Roundedness: `md`. No border.
*   **Secondary:** Ghost style. No background, `on_surface` text, and a `10% opacity` outline only on hover.

### Cards
*   Use `surface_container_low` for the base. Use `xl` (1.5rem) corner radius. 
*   **Constraint:** Never use divider lines. Separate card header from body using `24px` of vertical white space or a subtle shift to `surface_container_lowest` for the header area.

### Input Fields
*   **Style:** Minimalist underline or soft-filled. Prefer a soft-fill using `surface_container` with a `md` (0.75rem) radius.
*   **Focus:** Transition the background to `surface_container_lowest` and apply a `1px` ghost border using the `primary` color at 40% opacity.

### Data Visualizations
*   **The "Flow" Line:** Charts should use thick, `3px` paths with organic easing.
*   **Fills:** Use multi-stop gradients for area charts (e.g., `primary` at 20% opacity fading to 0%).
*   **Accents:** Use `tertiary` (#695d45) for secondary data trends to maintain the warm, organic palette.

---

## 6. Do's and Don'ts

### Do
*   **Do** use asymmetrical layouts. A 2/3 width card next to a 1/3 width card creates a more editorial, dynamic feel than two 50% cards.
*   **Do** embrace "White Space" (or in this case, "Cream Space"). Increase margins between sections to 48px or 64px.
*   **Do** use illustrative elements that break the container bounds (e.g., a character or icon overlapping the edge of a card) to add personality.

### Don't
*   **Don't** use pure black (#000000) for text. Always use `on_background` (#1b1d0e) to maintain the warmth of the system.
*   **Don't** use standard Material or FontAwesome icons "out of the box." Use refined, thin-stroke (1.5px) custom icons that match the `manrope` font weight.
*   **Don't** use hard-edged rectangles. Everything in this system has a degree of curvature to reinforce the "Flow" aesthetic.