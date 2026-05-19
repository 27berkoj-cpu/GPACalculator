# High School GPA Tracker

A simple browser-based GPA calculator that helps high school students track grades by semester or year.

## Features

- Add class entries with:
  - Name
  - Grade percentage
  - Credits
  - Course type (Regular, Honors/IB SL, AP/IB HL, CCP)
- Automatically convert percentage grades to letter grades.
- Calculate both weighted and unweighted GPA.
- Manage and switch between multiple semesters/years.
- Clear the current semester or delete a semester entirely.
- Dark mode with persistent preference.
- Sample data preview mode to see how the app works.
- Responsive layout and local storage persistence.

## Usage

1. Open `index.html` in your browser.
2. Use the **Semester/Year** dropdown to select or create a period.
3. Enter class details and click **Add Class**.
4. Click **Calculate GPA** to see your weighted and unweighted GPA.
5. Use **Clear All** to remove all classes from the current semester.
6. Toggle dark mode using the checkbox.

## Development

This project uses plain HTML, CSS, and JavaScript.

- `index.html` contains the structure and accessible UI.
- `style.css` handles the visual design and responsive behavior.
- `script.js` contains the GPA logic, semester storage, and UI controls.

To preview changes, open `index.html` in the browser or use a local development server.

## Notes

- Data is stored locally in your browser using `localStorage`.
- The displayed scale uses common high school grade boundaries.
- CCP courses currently use the same weighted values as AP/IB HL.
- No backend service is required.

Feel free to extend this tracker with additional export/import or custom grade scales.

## Recent UI updates

- Edit and Delete controls in the class table were restyled and center-aligned for clearer spacing and better accessibility.
- Buttons are spaced further apart to avoid touching; hover and focus states improve discoverability.
- The class form now accepts credit values with two-decimal precision (for example `0.33` and `0.67`).
- New entries are added to the top of the class list so the newest classes appear first.
