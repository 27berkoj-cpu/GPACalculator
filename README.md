# High School GPA Tracker

A simple web application that helps high school students calculate their GPA per semester or year.

## Features

- Enter classes with:
  - Name
  - Grade percentage
  - Credits
  - Course type (Regular, Honors/IB SL, AP/IB HL, CCP)
- Automatically convert percentage to letter grade.
- Calculate both weighted and unweighted GPA.
- Highlight highest and lowest grades.
- Manage multiple semesters/years and switch between them.
- Dark mode with persistent preference.
- Smooth fade-in animation on load.
- Export class list as CSV.
- Data saved to `localStorage` and restored on reload.

## Usage

1. Open `index.html` in a browser.
2. Use the **Semester/Year** dropdown to select or create a new period.
3. Fill in class information and click **Add Class**.
4. Once all classes are added, click **Calculate GPA** to see results.
5. Results will display weighted and unweighted GPAs and percentage-to-letter conversion.
6. Use **Export CSV** to save the current list.
7. Toggle dark mode using the checkbox.
8. Clear all entries for the current semester with **Clear All**.

## Development

The code is plain HTML, CSS and JavaScript. To modify:

- `index.html` contains the markup and UI.
- `style.css` handles styling including dark mode.
- `script.js` implements logic and persistence.

Simply edit the files and refresh the browser to see changes.

## Notes

- The CCP grade type is treated with highest weight.
- `localStorage` keys used: `gpa_semesters`, `gpa_dark`.
- No backend is required – all data is stored locally.

Feel free to adapt or extend this tracker for additional features.