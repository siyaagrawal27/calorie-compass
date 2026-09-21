# Accessibility improvements

## Goal
Make SmartCal easier to complete with a keyboard, clearer under keyboard focus, understandable to screen readers, and more legible without changing its Soft Clay character or calculator behavior.

## Changes
- Replace the hand-built sex and activity choices with accessible radio groups that support Tab plus arrow-key selection.
- Keep unit selectors keyboard-operable and give each group a clear screen-reader name and selected state.
- Connect every input and choice group to its label, help/error message, required state, and measurement unit; add suitable autocomplete hints.
- On an invalid submission, move focus to the first invalid field and announce a concise error summary.
- On a successful calculation, move focus to the results heading and announce the final values once, without reading every animation frame.
- Add a keyboard-visible focus ring to all controls and links, with enough offset to remain visible on pastel surfaces.
- Strengthen faint text, selected-control, button, error, and placeholder contrast while preserving the existing palette.
- Respect reduced-motion preferences for number animation, scrolling, and entrance effects.
- Add a skip link and ensure the page has one clear main content region.

## Verification
- Test the complete form using only Tab, Shift+Tab, arrow keys, Space, and Enter.
- Check invalid-field focus, announcements, unit switching, result focus, reduced motion, and desktop/mobile layout.
- Run an automated accessibility scan and verify there are no browser console errors.

## Technical details
- Use the existing Radix/shadcn radio primitives and button/input components where appropriate.
- Add stable IDs and `aria-describedby`/`aria-errormessage` relationships for contextual errors.
- Keep calculations fully client-side; no data handling or product scope changes.
