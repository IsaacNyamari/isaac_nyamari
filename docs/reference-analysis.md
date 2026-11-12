# Reference Website Analysis — elvisw.online

Inspected on 2026-10-30 using an in-app browser (desktop viewport ~800px wide in the pane, plus the
site's own CSS read through computed styles and stylesheet rules). The reference is used as design
inspiration only. No biography, copy, images, company names or contact details from it are reused.

## Method and limitations

- **Observed directly:** homepage (`/`), `/blog/`, a single blog article, `/about/`, `/contact/`.
  Text content, section structure, computed styles, CSS custom properties, inline CSS for the
  header, footer and page body, and inline JavaScript were read from the live DOM.
- **Not inspected in depth:** `/masterclasses/` and `/speaking/` (they are specific to the owner's
  business and have no equivalent here). Their existence is known from navigation only.
- **Responsive behaviour** is taken from the site's own media queries (900px, 560px, 980px and 720px
  breakpoints) rather than from screenshots at every width. A screenshot of the article page timed
  out in the pane, so article layout notes come from computed styles.
- **Platform:** WordPress 7.1 with the Kadence theme and Elementor. The distinctive design lives in
  hand-written CSS blocks (`.ew`, `.ewh`, `.ewf` namespaces) embedded in the pages.

## Page inventory

| Route | Purpose | Notable sections |
|---|---|---|
| `/` | Home | Dark hero with portrait + stats, "trusted by" row, about split, 3 service cards, dark feature band, 3 company cards, speaking band (bark colour), dark resources band, blog cards, gallery grid, dark contact block |
| `/about/` | Biography | Dark hero, split intro, story, principles, dark "numbers" band, timeline, personal section, gallery strip, dark CTA |
| `/blog/` | Article index | Two-column card grid on cream, card = title, author, date, excerpt, "Read more →" |
| `/<post-slug>/` | Article | Single column (~794px), 18px/1.7 body, H2 subheads, related posts block, no share links or TOC |
| `/contact/` | Contact | Large "Let's talk." hero, contact methods, embedded map, social list |
| `/masterclasses/`, `/speaking/` | Owner-specific offerings | Not analysed |
| `/privacy-policy-for-elvisw-online/` | Privacy | Linked from footer |

## Shared component structure

1. **Utility top bar** (`#1B1A18`, 0.82rem): phone and email on the left, social links on the right.
2. **Sticky main nav**: `position: sticky; top: 0`, `rgba(37,36,34,.92)` with `backdrop-filter: blur(12px)`,
   72px tall, 1180px max width. Serif wordmark with an accent-coloured trailing full stop. Links in
   sand colour turn cream on hover, with a 2px accent underline that scales in from the left
   (`transform: scaleX(0→1)`, 0.22s). Accent-filled CTA button at far right.
3. **Section rhythm**: alternating cream (`#FFFCF2`), warm off-white (`#FBF6EC`), ink (`#252422`) and
   bark (`#403D39`) full-bleed bands. Each band starts with a small uppercase accent "eyebrow", a
   large serif H2 and a muted lead paragraph.
4. **Cards**: white, 1px sand border, 16px radius, 34×30px padding, lift 4px with soft shadow on hover.
5. **Footer**: very dark (`#1B1A18`), 5-column grid (brand + blurb + pill social links, Explore,
   Companies, Masterclasses, Get in touch), map, bottom bar with copyright and legal links.

## Colours (from `:root` custom properties)

| Token | Hex | Use |
|---|---|---|
| canvas | `#FFFCF2` | page background, text on dark |
| off-white | `#FBF6EC` | alternate light sections |
| sand | `#CCC5B9` | borders, muted text on dark |
| bark | `#403D39` | secondary dark band |
| ink | `#252422` | primary dark band, body text |
| deep ink | `#1B1A18` | top bar, footer |
| ember (accent) | `#EB5E28` | buttons, eyebrows, numbers, bullets |
| ember dark | `#C94A18` | link text on light |
| ember hover | `#FF6D35` | button hover |
| mid | `#6E675D` | muted body text on light |

## Typography

- **Headings:** Fraunces (variable serif, opsz 9–144), weight 600, line-height 1.1, letter-spacing −0.01em.
  H1 `clamp(2.4rem, 6vw, 4rem)`, H2 `clamp(2rem, 4vw, 2.9rem)`, H3 `clamp(1.3rem, 2.4vw, 1.7rem)`.
- **Body:** Inter 400/500/600, 18px, line-height 1.7; leads 1.15–1.22rem.
- **Eyebrows:** Inter 500, 0.78rem, letter-spacing 0.16em, uppercase, accent colour.
- Alternatives considered for an original identity: Newsreader, Instrument Serif or Source Serif for
  headings; Inter or Geist for body; a monospace (JetBrains Mono) for labels.

## Layout and spacing

- Content wrapper 1180px max, 24px side padding.
- Section padding `clamp(64px, 9vw, 120px)` top and bottom.
- Hero: 2-column grid `1.05fr .95fr`, 56px gap; portrait at `aspect-ratio: 4/5`, 18px radius, with an
  accent block offset −16px behind the bottom-right corner.
- Grids: 3-column cards with 24px gap; 2-column splits with 60px gap; 4-column square gallery.
- Radii: 8px (buttons), 12–18px (cards and images).

## Animation and interaction

| Effect | Trigger | Timing |
|---|---|---|
| Scroll reveal (`opacity 0→1`, `translateY(24px→0)`) | IntersectionObserver, threshold 0.12, once | 0.7s ease |
| Nav underline scale-in | hover / active route | 0.22s ease |
| Button lift (`translateY(-2px)`) and colour change | hover | 0.15s / 0.18s ease |
| Card lift (`translateY(-4px)` + shadow) | hover | 0.18s ease |
| Gallery image zoom (`scale(1.04)`) | hover | 0.25s ease |
| Mobile menu slide/fade (`translateY(-14px)→0`) | burger click | 0.22s ease |
| Burger → X morph | burger click | 0.25s ease |
| Smooth scroll for in-page anchors | click | browser native |
| Scroll-to-top button fade | scroll > 100px | 0.2–0.3s |

`prefers-reduced-motion: reduce` disables transitions globally. There is no scroll-jacking,
parallax or page-transition animation; the motion is restrained.

## Responsive behaviour (from media queries)

- **≤980px:** nav collapses to a burger; the menu becomes a full-width dropdown panel under the bar.
- **≤900px:** hero, splits and contact grid stack to one column; card grids drop to 2 columns;
  the hero's offset accent block is hidden; footer becomes 2 columns.
- **≤720px:** utility bar centres and wraps.
- **≤560px:** all grids go to 1 column, buttons become full width, stat figures shrink, footer
  becomes a single column.

## Decisions for the Isaac Nyamari site

**Reproduce (pattern level):** sticky blurred dark nav with scale-in underline; alternating
light/dark full-bleed bands; eyebrow → serif H2 → lead heading stack; card hover lift; once-only
scroll reveals at ~0.7s; 2-column hero with an offset accent block behind the image; dark multi-column
footer; restrained motion with reduced-motion support.

**Adapt (original identity):**
- Palette taken from the supplied Isaac Nyamari logo files (`public/brand/`): deep navy ink `#0B1222`,
  navy `#16213D`/`#1E2A4A`, navy line `#2C3B63`, and the logo's gold gradient `#F5C861 → #D9952B`
  (solid accent `#E9B04A`, accessible text gold `#8A5A0B`) on a warm paper canvas `#F7F5F0`.
  (An initial jade-accent idea was dropped once the brand assets were provided.)
- Type: **Newsreader** (serif headings, the editorial role Fraunces plays on the reference),
  **Inter** (body) and **Montserrat** (eyebrows, navigation, buttons — matching the logo wordmark).
- Wordmark: the supplied "N" monogram (gold I-stroke) rebuilt as inline SVG + HTML text so it stays
  crisp and transparent on any background; uploaded logos in Settings override it.
- Hero visual: when no portrait has been uploaded, an animated systems console is shown instead of
  inventing a photo. The reference's offset accent block is reused behind it (gold gradient).
- Scroll reveals use the reference's approach (IntersectionObserver + class, content visible without
  JS); hero entrance is a CSS stagger so it plays on first paint; Motion for React drives the mobile
  menu, console animation and gallery lightbox.
- No "trusted by" logos, stats, testimonials or numbers unless the administrator enters real ones.
- Contact block driven entirely by configured settings; unset channels are hidden.
