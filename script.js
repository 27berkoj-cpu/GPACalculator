// The app stores the current class list and multiple semester records.
// Each semester is a key in `semesters`, with an array of class entries.
const classes = [];
let currentSemester = null;

// index of class being edited; -1 when not editing
let editingIndex = -1;

// Internal app storage: { semesterName: [classEntry, ...], ... }
let semesters = {};

// Sample preview state: shows example data without persisting it as a real semester.
let sampleActive = false;
let sampleBackup = null;
let sampleIndex = 0; // which fixed sample set is currently available

// Cached DOM references used throughout the app for better performance.
let semesterSelect = null;
let calculateButton = null;
let deleteSemesterButton = null;
let sampleButton = null;
let summaryOutput = null;
let classTableBody = null;
let classForm = null;
let darkToggle = null;
let gpaOutput = null;
let unwOutput = null;

// Save semester data and dark mode preference to localStorage.
function saveState() {
    localStorage.setItem('gpa_semesters', JSON.stringify(semesters));
    const dark = document.body.classList.contains('dark');
    localStorage.setItem('gpa_dark', dark ? '1' : '0');
}

// Load previously saved settings from localStorage.
function loadState() {
    const stored = localStorage.getItem('gpa_semesters');
    if (stored) {
        try {
            const obj = JSON.parse(stored);
            if (obj && typeof obj === 'object') {
                semesters = obj;
            }
        } catch (e) {
            console.warn('failed to parse semesters from storage', e);
        }
    }
    const dark = localStorage.getItem('gpa_dark');
    if (dark === '1') {
        document.body.classList.add('dark');
        const toggle = document.getElementById('dark-toggle');
        if (toggle) toggle.checked = true;
    }
}

// helper: map percentage to letter grade
// boundaries follow typical high-school percentages
function letterFromPercent(pct) {
    if (pct >= 98) return 'A+';
    if (pct >= 92) return 'A';
    if (pct >= 90) return 'A-';
    if (pct >= 88) return 'B+';
    if (pct >= 82) return 'B';
    if (pct >= 80) return 'B-';
    if (pct >= 78) return 'C+';
    if (pct >= 72) return 'C';
    if (pct >= 70) return 'C-';
    if (pct >= 68) return 'D+';
    if (pct >= 62) return 'D';
    if (pct >= 60) return 'D-';
    return 'F';
}

// tables for point values
const gradeTable = {
    regular: {
        'A+': 4.3, 'A': 4.0, 'A-': 3.7,
        'B+': 3.3, 'B': 3.0, 'B-': 2.7,
        'C+': 2.3, 'C': 2.0, 'C-': 1.7,
        'D+': 1.3, 'D': 1.0, 'D-': 0.7,
        'F': 0.0
    },
    honors: {
        'A+': 4.8375, 'A': 4.5, 'A-': 4.1625,
        'B+': 3.7125, 'B': 3.375, 'B-': 3.0375,
        'C+': 2.5875, 'C': 2.25, 'C-': 1.9125,
        'D+': 1.4625, 'D': 1.125, 'D-': 0.7875,
        'F': 0.0
    },
    ap: {
        'A+': 5.375, 'A': 5.0, 'A-': 4.625,
        'B+': 4.125, 'B': 3.75, 'B-': 3.375,
        'C+': 2.875, 'C': 2.5, 'C-': 2.125,
        'D+': 1.625, 'D': 1.25, 'D-': 0.875,
        'F': 0.0
    },
    ccp: { // treated as highest-weighted; same values as AP for now
        'A+': 5.375, 'A': 5.0, 'A-': 4.625,
        'B+': 4.125, 'B': 3.75, 'B-': 3.375,
        'C+': 2.875, 'C': 2.5, 'C-': 2.125,
        'D+': 1.625, 'D': 1.25, 'D-': 0.875,
        'F': 0.0
    }
};

function pointsFor(letter, type) {
    const table = gradeTable[type] || gradeTable.regular;
    return table[letter] ?? 0;
}

// display a quick semester summary for the current class list
function updateSummary() {
    if (!summaryOutput) return;

    const totalClasses = classes.length;
    const totalCredits = classes.reduce((sum, item) => sum + item.credit, 0);
    summaryOutput.textContent = totalClasses === 0
        ? 'No classes added yet.'
        : `Classes: ${totalClasses} · Total credits: ${totalCredits.toFixed(2)}`;
}

// generate a sample set containing each course type exactly once
// fixed sample sets (each set contains one of each course type)
const sampleSets = [
    // User-provided six-course example (uses default percent for letters)
    [
        { name: 'Honors English 1', percent: 81, letter: 'B-', points: pointsFor('B-', 'honors'), credit: 0.5, type: 'honors' },
        { name: 'Honors Biology', percent: 85, letter: 'B',  points: pointsFor('B',  'honors'), credit: 0.5, type: 'honors' },
        { name: 'AP World History', percent: 88, letter: 'B+', points: pointsFor('B+', 'ap'), credit: 0.5, type: 'ap' },
        { name: 'CCP Intro to Psychology', percent: 85, letter: 'B', points: pointsFor('B', 'ccp'), credit: 1.0, type: 'ccp' },
        { name: 'Financial Literacy', percent: 95, letter: 'A', points: pointsFor('A', 'regular'), credit: 0.5, type: 'regular' },
        { name: 'PE', percent: 91, letter: 'A-', points: pointsFor('A-', 'regular'), credit: 0.25, type: 'regular' }
    ],
    // Additional fixed six-course examples (non-random)
    [
        { name: 'Algebra I', percent: 92, letter: 'A', points: pointsFor('A', 'regular'), credit: 1, type: 'regular' },
        { name: 'Honors Chemistry', percent: 88, letter: 'B+', points: pointsFor('B+', 'honors'), credit: 1, type: 'honors' },
        { name: 'AP Biology', percent: 94, letter: 'A', points: pointsFor('A', 'ap'), credit: 1, type: 'ap' },
        { name: 'CCP College Writing', percent: 90, letter: 'A-', points: pointsFor('A-', 'ccp'), credit: 1, type: 'ccp' },
        { name: 'World Geography', percent: 84, letter: 'B', points: pointsFor('B', 'regular'), credit: 0.5, type: 'regular' },
        { name: 'Health', percent: 79, letter: 'C+', points: pointsFor('C+', 'regular'), credit: 0.5, type: 'regular' }
    ],
    [
        { name: 'English 9', percent: 85, letter: 'B', points: pointsFor('B', 'regular'), credit: 1, type: 'regular' },
        { name: 'Honors World History', percent: 91, letter: 'A-', points: pointsFor('A-', 'honors'), credit: 1, type: 'honors' },
        { name: 'AP Calculus', percent: 96, letter: 'A', points: pointsFor('A', 'ap'), credit: 1, type: 'ap' },
        { name: 'CCP Intro to Psychology', percent: 89, letter: 'B+', points: pointsFor('B+', 'ccp'), credit: 1, type: 'ccp' },
        { name: 'Geometry', percent: 78, letter: 'C+', points: pointsFor('C+', 'regular'), credit: 1, type: 'regular' },
        { name: 'PE Fitness', percent: 93, letter: 'A', points: pointsFor('A', 'regular'), credit: 0.5, type: 'regular' }
    ]
];

// toggle showing a fixed sample set; sequence: show -> hide -> show next -> hide -> ...
function toggleSample() {
    const btn = document.getElementById('sample-btn');
    const addBtn = document.getElementById('add-class');

    if (sampleActive) {
        // hide sample: restore backup and advance to next sample index
        classes.length = 0;
        if (Array.isArray(sampleBackup)) sampleBackup.forEach(c => classes.push(c));
        sampleBackup = null;
        sampleActive = false;
        sampleIndex = (sampleIndex + 1) % sampleSets.length;
        btn.textContent = 'Show Sample';
        addBtn.disabled = false;
        // restore persisted semester data as well
        if (currentSemester) semesters[currentSemester] = classes.slice();
        saveState();
        updateTable();
    } else {
        // show sample: backup current classes then replace with fixed set
        sampleBackup = classes.slice();
        const sample = sampleSets[sampleIndex];
        classes.length = 0;
        sample.forEach(c => classes.unshift(Object.assign({}, c)));
        sampleActive = true;
        btn.textContent = 'Hide Sample';
        addBtn.disabled = true;
        updateTable();
    }
}

// refresh the table UI from the classes array
function updateTable() {
    const tbody = classTableBody || document.querySelector('#class-table tbody');
    if (!tbody) return;

    tbody.innerHTML = '';
    if (classes.length === 0) {
        updateCalculateButton();
        updateSummary();
        document.getElementById('gpa-output').textContent = '';
        document.getElementById('unweighted-output').textContent = '';
        return;
    }

    // compute highest/lowest based on weighted point values for table highlighting
    let max = -Infinity, min = Infinity;
    classes.forEach(c => {
        const val = c.points;
        if (val > max) max = val;
        if (val < min) min = val;
    });

    classes.forEach((c, idx) => {
        const tr = document.createElement('tr');
        if (c.points === max) tr.classList.add('highest');
        if (c.points === min) tr.classList.add('lowest');
        const typeLabel = c.type === 'regular' ? 'Regular' : (c.type === 'honors' ? 'Honors' : 'AP/IB/CCP');
        tr.innerHTML = `
            <td>${c.name}</td>
            <td>${c.percent.toFixed(2)}</td>
            <td>${c.letter}</td>
            <td>${c.points.toFixed(4)}</td>
            <td>${c.credit.toFixed(2)}</td>
            <td>${typeLabel}</td>
            <td>
                <button class="edit-btn" aria-label="Edit class ${c.name}" data-index="${idx}">✎</button>
                <button class="delete-btn" aria-label="Delete class ${c.name}" data-index="${idx}">✖</button>
            </td>
        `;
        tbody.appendChild(tr);
    });

    updateCalculateButton();
    updateSummary();
}

function addClass() {
    if (!currentSemester) return; // safety
    const nameInput = document.getElementById('classname');
    const gradeInput = document.getElementById('grade');
    const creditInput = document.getElementById('credit');
    const type = document.getElementById('type').value;

    const name = nameInput.value.trim();
    const pct = parseFloat(gradeInput.value);
    let credit = parseFloat(creditInput.value);

    if (!name) {
        alert('Please enter a class name.');
        nameInput.focus();
        return;
    }

    if (isNaN(pct) || pct < 0 || pct > 100) {
        alert('Please enter a valid percentage between 0 and 100.');
        gradeInput.focus();
        return;
    }

    if (isNaN(credit) || credit <= 0) {
        alert('Please enter a valid non-zero credit amount.');
        creditInput.focus();
        return;
    }

    // normalize credit to two decimal places (supports .33 and .67)
    credit = Math.round(credit * 100) / 100;

    const letter = letterFromPercent(pct);
    const pts = pointsFor(letter, type);

    const entry = {
        name: name,
        percent: pct,
        letter: letter,
        points: pts,
        credit: credit,
        type: type
    };

    if (editingIndex >= 0 && editingIndex < classes.length) {
        // save edited entry in-place
        classes[editingIndex] = entry;
        editingIndex = -1;
        const addBtn = document.getElementById('add-class');
        if (addBtn) addBtn.textContent = 'Add Class';
        const cancelBtn = document.getElementById('cancel-edit');
        if (cancelBtn) cancelBtn.style.display = 'none';
    } else {
        // add newest classes at the top
        classes.unshift(entry);
    }

    semesters[currentSemester] = classes.slice();
    saveState();

    nameInput.value = '';
    gradeInput.value = '';
    creditInput.value = '';
    document.getElementById('classname').focus();

    updateTable();
}

function startEdit(index) {
    if (index < 0 || index >= classes.length) return;
    const c = classes[index];
    document.getElementById('classname').value = c.name;
    document.getElementById('grade').value = c.percent;
    document.getElementById('credit').value = c.credit;
    document.getElementById('type').value = c.type;
    editingIndex = index;
    const addBtn = document.getElementById('add-class');
    if (addBtn) addBtn.textContent = 'Save';
    const cancelBtn = document.getElementById('cancel-edit');
    if (cancelBtn) cancelBtn.style.display = '';
    document.getElementById('classname').focus();
}

function cancelEdit() {
    editingIndex = -1;
    const addBtn = document.getElementById('add-class');
    if (addBtn) addBtn.textContent = 'Add Class';
    const cancelBtn = document.getElementById('cancel-edit');
    if (cancelBtn) cancelBtn.style.display = 'none';
    // clear fields
    document.getElementById('classname').value = '';
    document.getElementById('grade').value = '';
    document.getElementById('credit').value = '';
}


// compute and display weighted + unweighted GPA
function calculateGPA() {
    // ensure there's at least one class to compute
    if (classes.length === 0) {
        alert('No classes added.');
        return;
    }

    let totalPoints = 0;
    let totalCredits = 0;

    // also accumulate points on regular scale for unweighted GPA
    let totalPointsUnw = 0;

    classes.forEach(c => {
        totalPoints += c.points * c.credit;
        totalCredits += c.credit;
        const ptsUnw = pointsFor(c.letter, 'regular');
        totalPointsUnw += ptsUnw * c.credit;
    });

    if (!isFinite(totalCredits) || totalCredits <= 0) {
        alert('Total credits must be greater than zero to calculate GPA.');
        return;
    }
    const gpa = totalPoints / totalCredits;
    const gpaUnw = totalPointsUnw / totalCredits;
    if (gpaOutput) gpaOutput.textContent = `Weighted GPA: ${gpa.toFixed(3)}`;
    if (unwOutput) unwOutput.textContent = `Unweighted GPA: ${gpaUnw.toFixed(3)}`;

    // if three or more classes, apply special styling for readability
    const resDiv = document.querySelector('.result');
    if (classes.length >= 3) {
        resDiv.classList.add('high-classes');
    } else {
        resDiv.classList.remove('high-classes');
    }
}

// remove a single class by index, called by delete buttons
function removeClass(index) {
    if (index >= 0 && index < classes.length) {
        classes.splice(index, 1);
        // Persist the updated classes array to the current semester.
        if (currentSemester) semesters[currentSemester] = classes.slice();
        saveState();
        updateTable();
        if (gpaOutput) gpaOutput.textContent = '';
        if (unwOutput) unwOutput.textContent = '';
    }
}

// populate the conversion tables shown under results
function populateScaleInfo() {
    const pctEl = document.getElementById('percentage-to-letter');

    // generate percentage to letter mapping text
    const ranges = [
        ['A+', 98, 100], ['A', 92, 97], ['A-', 90, 91],
        ['B+', 88, 89], ['B', 82, 87], ['B-', 80, 81],
        ['C+', 78, 79], ['C', 72, 77], ['C-', 70, 71],
        ['D+', 68, 69], ['D', 62, 67], ['D-', 60, 61],
        ['F', 0, 59]
    ];
    pctEl.textContent = ranges.map(r => `${r[0]} = ${r[1]}‑${r[2]}%`).join('\n');


}



// Enable or disable the Calculate button depending on whether any classes exist.
function updateCalculateButton() {
    if (!calculateButton) calculateButton = document.getElementById('calculate');
    if (!calculateButton) return;
    calculateButton.disabled = classes.length === 0;
}


// remove all classes and reset display
function clearAll() {
    // if a sample is showing, hide it and reset sample state so the button shows "Show Sample"
    if (sampleActive) {
        const sampleBtn = document.getElementById('sample-btn');
        if (sampleBtn) sampleBtn.textContent = 'Show Sample';
        sampleActive = false;
        sampleBackup = null;
        const addBtn = document.getElementById('add-class');
        if (addBtn) addBtn.disabled = false;
    }

    classes.length = 0;
    if (currentSemester) semesters[currentSemester] = [];
    if (gpaOutput) gpaOutput.textContent = '';
    if (unwOutput) unwOutput.textContent = '';
    saveState();
    updateTable();
}

// semester helpers
function populateSemesterList() {
    if (!semesterSelect) return;
    semesterSelect.innerHTML = '';
    Object.keys(semesters).forEach(name => {
        const opt = document.createElement('option');
        opt.value = name;
        opt.textContent = name;
        semesterSelect.appendChild(opt);
    });
    semesterSelect.value = currentSemester || semesterSelect.options[0]?.value || '';
    if (!semesterSelect.value && semesterSelect.options.length > 0) {
        semesterSelect.selectedIndex = 0;
        currentSemester = semesterSelect.value;
    }
    if (deleteSemesterButton) {
        deleteSemesterButton.disabled = Object.keys(semesters).length <= 1;
    }
}

function switchSemester() {
    if (!semesterSelect) return;
    currentSemester = semesterSelect.value;
    loadCurrentSemester();
}

function createSemester() {
    const name = prompt('Enter new semester/year name:')?.trim();
    if (!name) return;
    if (semesters[name]) {
        alert('A semester with that name already exists.');
        return;
    }
    semesters[name] = [];
    currentSemester = name;
    populateSemesterList();
    saveState();
    loadCurrentSemester();
}

function deleteSemester() {
    if (!currentSemester || Object.keys(semesters).length <= 1) {
        alert('At least one semester must remain.');
        return;
    }
    if (!confirm(`Delete semester "${currentSemester}"? This cannot be undone.`)) {
        return;
    }
    delete semesters[currentSemester];
    currentSemester = Object.keys(semesters)[0];
    populateSemesterList();
    saveState();
    loadCurrentSemester();
}

function loadCurrentSemester() {
    // clear existing classes and load from semesters object
    classes.length = 0;
    if (semesters[currentSemester]) {
        semesters[currentSemester].forEach(c => classes.push(c));
    }
    updateTable();
}

function handleTableClick(event) {
    const deleteBtn = event.target.closest('.delete-btn');
    if (deleteBtn) {
        const idx = parseInt(deleteBtn.getAttribute('data-index'), 10);
        if (!Number.isNaN(idx)) removeClass(idx);
        return;
    }
    const editBtn = event.target.closest('.edit-btn');
    if (editBtn) {
        const idx = parseInt(editBtn.getAttribute('data-index'), 10);
        if (!Number.isNaN(idx)) startEdit(idx);
        return;
    }
}

// assign listeners and restore previous state
function init() {
    classForm = document.getElementById('class-form');
    semesterSelect = document.getElementById('semester');
    calculateButton = document.getElementById('calculate');
    sampleButton = document.getElementById('sample-btn');
    deleteSemesterButton = document.getElementById('delete-semester');
    summaryOutput = document.getElementById('summary-output');
    classTableBody = document.querySelector('#class-table tbody');
    darkToggle = document.getElementById('dark-toggle');
    gpaOutput = document.getElementById('gpa-output');
    unwOutput = document.getElementById('unweighted-output');

    if (classForm) {
        classForm.addEventListener('submit', (event) => {
            event.preventDefault();
            addClass();
        });
    }

    const cancelEditBtn = document.getElementById('cancel-edit');
    if (cancelEditBtn) cancelEditBtn.addEventListener('click', cancelEdit);

    if (calculateButton) calculateButton.addEventListener('click', calculateGPA);
    document.getElementById('clear-all').addEventListener('click', clearAll);

    // semester controls
    if (semesterSelect) semesterSelect.addEventListener('change', switchSemester);
    document.getElementById('new-semester').addEventListener('click', createSemester);
    if (deleteSemesterButton) deleteSemesterButton.addEventListener('click', deleteSemester);

    // sample preview control
    if (sampleButton) sampleButton.addEventListener('click', toggleSample);

    // dark mode toggle logic
    if (darkToggle) {
        darkToggle.addEventListener('change', () => {
            document.body.classList.toggle('dark', darkToggle.checked);
            saveState();
        });
    }

    if (classTableBody) {
        classTableBody.addEventListener('click', handleTableClick);
    }

    // load saved semesters and theme
    loadState();
    if (Object.keys(semesters).length === 0) {
        semesters['Default'] = [];
    }
    populateSemesterList();
    currentSemester = Object.keys(semesters)[0];
    loadCurrentSemester();

    if (!localStorage.getItem('gpa_dark') && darkToggle) {
        const prefers = window.matchMedia('(prefers-color-scheme: dark)').matches;
        document.body.classList.toggle('dark', prefers);
        darkToggle.checked = prefers;
    }

    populateScaleInfo();
}


window.addEventListener('DOMContentLoaded', init);
