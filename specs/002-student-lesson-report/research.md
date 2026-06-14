# Research: Student Lesson Report & Website Redesign

This document details research and design choices made for the Student Lesson Report feature and the overall visual redesign of the portal.

## Design Alignment: design-taste-frontend

### Typography & Fonts
* **Decision**: Lock Display Font to `Sora` and Body Font to `Be Vietnam Pro`.
* **Rationale**: The master template already imports these fonts. They match modern sans-serif tech vibes and have excellent readability.
* **Alternatives Considered**: Defaulting to `Inter` (rejected as too generic, although clean).

### Color & Theme Consistency
* **Decision**: Restrict the color palette to the FPT Orange brand color (`#f26a21`) as the primary accent and Slate/Zinc for neutrals, with emerald green for success, rose/red for failed states, and amber/orange for at-risk states.
* **Rationale**: Simple, clean, and complies with the design system consistency lock. No neon gradients.
* **Theme Lock**: Standardize styling in `style.css` so that layout elements have exactly one mode per choice (no mixing light/dark in components).

### Materiality & Corners
* **Decision**: Set `--radius-md` to `10px` and `--radius-lg`/`--radius-xl` to `8px` consistently.
* **Rationale**: Promotes visual rhythm and keeps form inputs, buttons, and card borders aligned.

---

## Captcha Integration (Student Submissions)
* **Decision**: Public report form submissions verify reCAPTCHA on the server.
* **Rationale**: Protects the public endpoint `/api/public/submit-report` from automated spam.
* **Alternatives Considered**: Turnstile (rejected as reCAPTCHA configuration is already defined in backend controllers).
