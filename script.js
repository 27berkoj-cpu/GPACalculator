// manage current semester classes array
const classes = [];
let currentSemester = null;

// internal storage object: { semesterName: [class,...], ... }
let semesters = {};

// sample preview state (not persisted into semesters)
let sampleActive = false;
let sampleBackup = null;
let sampleIndex = 0; // which fixed sample to show next

// undo/redo history stacks (store snapshots of `classes`)
const history = [];
const redoStack = [];


// save semesters object and dark mode to localStorage
function saveState() {
    localStorage.setItem('gpa_semesters', JSON.stringify(semesters));
    const dark = document.body.classList.contains('dark');
    localStorage.setItem('gpa_dark', dark ? '1' : '0');
}

// load state from localStorage and apply
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
    if (pct >= 97) return 'A+';
    if (pct >= 93) return 'A';
    if (pct >= 90) return 'A-';
    if (pct >= 87) return 'B+';
    if (pct >= 83) return 'B';
    if (pct >= 80) return 'B-';
    if (pct >= 77) return 'C+';
    if (pct >= 73) return 'C';
    if (pct >= 70) return 'C-';
    if (pct >= 67) return 'D+';
    if (pct >= 63) return 'D';
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

// ---- history / undo-redo helpers --------------------------------
function updateHistoryButtons() {
    const undoBtn = document.getElementById('undo');
    const redoBtn = document.getElementById('redo');
    if (undoBtn) undoBtn.disabled = history.length === 0 || sampleActive;
    if (redoBtn) redoBtn.disabled = redoStack.length === 0 || sampleActive;
}

function pushHistory() {
    // snapshot current classes
    history.push(classes.map(c => ({ ...c }))); 
    // clear redo stack when new action occurs
    redoStack.length = 0;
    updateHistoryButtons();
}

function undo() {
    if (history.length === 0) return;
    // save current for redo
    redoStack.push(classes.map(c => ({ ...c })));
    const prev = history.pop();
    classes.length = 0;
    prev.forEach(c => classes.push({ ...c }));
    if (currentSemester) semesters[currentSemester] = classes.slice();
    saveState();
    updateTable();
    updateHistoryButtons();
}

function redo() {
    if (redoStack.length === 0) return;
    history.push(classes.map(c => ({ ...c })));
    const next = redoStack.pop();
    classes.length = 0;
    next.forEach(c => classes.push({ ...c }));
    if (currentSemester) semesters[currentSemester] = classes.slice();
    saveState();
    updateTable();
    updateHistoryButtons();
}

function clearHistory() {
    history.length = 0;
    redoStack.length = 0;
    updateHistoryButtons();
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
        { name: 'Algebra I', percent: 92, letter: 'A-', points: pointsFor('A-', 'regular'), credit: 1, type: 'regular' },
        { name: 'Honors Chemistry', percent: 88, letter: 'B+', points: pointsFor('B+', 'honors'), credit: 1, type: 'honors' },
        { name: 'AP Biology', percent: 94, letter: 'A', points: pointsFor('A', 'ap'), credit: 1, type: 'ap' },
        { name: 'CCP College Writing', percent: 90, letter: 'A-', points: pointsFor('A-', 'ccp'), credit: 1, type: 'ccp' },
        { name: 'World Geography', percent: 84, letter: 'B', points: pointsFor('B', 'regular'), credit: 0.5, type: 'regular' },
        { name: 'Health', percent: 79, letter: 'C+', points: pointsFor('C+', 'regular'), credit: 0.5, type: 'regular' }
    ],
    [
        { name: 'English 9', percent: 85, letter: 'B', points: pointsFor('B', 'regular'), credit: 1, type: 'regular' },
        { name: 'Honors World History', percent: 91, letter: 'A-', points: pointsFor('A-', 'honors'), credit: 1, type: 'honors' },
        { name: 'AP Calculus', percent: 96, letter: 'A+', points: pointsFor('A+', 'ap'), credit: 1, type: 'ap' },
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
        clearHistory();
        // restore persisted semester data as well
        if (currentSemester) semesters[currentSemester] = classes.slice();
        saveState();
        updateTable();
    } else {
        // show sample: backup current classes then replace with fixed set
        sampleBackup = classes.slice();
        const sample = sampleSets[sampleIndex];
        classes.length = 0;
        sample.forEach(c => classes.push(Object.assign({}, c)));
        sampleActive = true;
        btn.textContent = 'Hide Sample';
        addBtn.disabled = true;
        clearHistory();
        updateTable();
    }
}

// refresh the table UI from the classes array
function updateTable() {
    const tbody = document.querySelector('#class-table tbody');
    tbody.innerHTML = '';
    if (classes.length === 0) return;

    // compute highest/lowest based on points (scale) for highlighting
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
            <td>${idx + 1}</td>
            <td>${c.name}</td>
            <td>${c.percent.toFixed(2)}</td>
            <td>${c.letter}</td>
            <td>${c.points.toFixed(4)}</td>
            <td>${c.credit}</td>
            <td>${typeLabel}</td>
            <td><button class="delete-btn" aria-label="Delete class ${c.name}" data-index="${idx}">✖</button></td>
        `;
        tbody.appendChild(tr);
    });
    // attach click handlers to delete buttons (delegation could also work)
    tbody.querySelectorAll('.delete-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const idx = parseInt(btn.getAttribute('data-index'), 10);
            removeClass(idx);
        });
    });
    updateCalculateButton();
}

function addClass() {
    if (!currentSemester) return; // safety
    // record previous state for undo
    pushHistory();
    const nameInput = document.getElementById('classname');
    const gradeInput = document.getElementById('grade');
    const creditInput = document.getElementById('credit');
    const type = document.getElementById('type').value;

    const pct = parseFloat(gradeInput.value);
    const credit = parseFloat(creditInput.value);
    if (isNaN(pct) || isNaN(credit) || credit <= 0) {
        alert('Please enter valid percentage and credits.');
        return;
    }

    const letter = letterFromPercent(pct);
    const pts = pointsFor(letter, type);

    classes.push({
        name: nameInput.value.trim() || '(unnamed)',
        percent: pct,
        letter: letter,
        points: pts,
        credit: credit,
        type: type
    });
    semesters[currentSemester] = classes.slice();
    saveState();

    nameInput.value = '';
    gradeInput.value = '';
    creditInput.value = '';
    document.getElementById('classname').focus();

    updateTable();
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
    const out = document.getElementById('gpa-output');
    const outUnw = document.getElementById('unweighted-output');
    out.textContent = `Weighted GPA: ${gpa.toFixed(3)}`;
    outUnw.textContent = `Unweighted GPA: ${gpaUnw.toFixed(3)}`;

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
        // save state for undo before removal
        pushHistory();
        classes.splice(index, 1);
        // persist the updated classes array to the current semester
        if (currentSemester) semesters[currentSemester] = classes.slice();
        saveState();
        updateTable();
        document.getElementById('gpa-output').textContent = '';
        document.getElementById('unweighted-output').textContent = '';
    }
}

// populate the conversion tables shown under results
function populateScaleInfo() {
    const pctEl = document.getElementById('percentage-to-letter');

    // generate percentage to letter mapping text
    const ranges = [
        ['A+', 97, 100], ['A', 93, 96.99], ['A-', 90, 92.99],
        ['B+', 87, 89.99], ['B', 83, 86.99], ['B-', 80, 82.99],
        ['C+', 77, 79.99], ['C', 73, 76.99], ['C-', 70, 72.99],
        ['D+', 67, 69.99], ['D', 63, 66.99], ['D-', 60, 62.99],
        ['F', 0, 59.99]
    ];
    pctEl.textContent = ranges.map(r => `${r[0]} = ${r[1]}‑${r[2]}%`).join('\n');


}



// enable/disable calculate button based on data presence
function updateCalculateButton() {
    const btn = document.getElementById('calculate');
    btn.disabled = classes.length === 0;
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
        clearHistory();
    }

    if (classes.length > 0) pushHistory();
    classes.length = 0;
    if (currentSemester) semesters[currentSemester] = [];
    const gpaOut = document.getElementById('gpa-output');
    const unwOut = document.getElementById('unweighted-output');
    if (gpaOut) gpaOut.textContent = '';
    if (unwOut) unwOut.textContent = '';
    saveState();
    updateTable();
}

// semester helpers
function populateSemesterList() {
    const sel = document.getElementById('semester');
    sel.innerHTML = '';
    Object.keys(semesters).forEach(name => {
        const opt = document.createElement('option');
        opt.value = name;
        opt.textContent = name;
        sel.appendChild(opt);
    });
    sel.value = currentSemester;
}

function switchSemester() {
    const sel = document.getElementById('semester');
    currentSemester = sel.value;
    loadCurrentSemester();
}

function createSemester() {
    const name = prompt('Enter new semester/year name:');
    if (name && !semesters[name]) {
        semesters[name] = [];
        currentSemester = name;
        populateSemesterList();
        saveState();
        loadCurrentSemester();
    }
}

function loadCurrentSemester() {
    // clear existing classes and load from semesters object
    classes.length = 0;
    if (semesters[currentSemester]) {
        semesters[currentSemester].forEach(c => classes.push(c));
    }
    updateTable();
    clearHistory();
}

// assign listeners and restore previous state
function init() {
    document.getElementById('add-class').addEventListener('click', addClass);
    document.getElementById('calculate').addEventListener('click', calculateGPA);
    document.getElementById('clear-all').addEventListener('click', clearAll);
    // undo/redo listeners
    const undoBtn = document.getElementById('undo');
    const redoBtn = document.getElementById('redo');
    if (undoBtn) undoBtn.addEventListener('click', undo);
    if (redoBtn) redoBtn.addEventListener('click', redo);

    // semester controls
    document.getElementById('semester').addEventListener('change', switchSemester);
    document.getElementById('new-semester').addEventListener('click', createSemester);
    // sample preview control
    const sampleBtn = document.getElementById('sample-btn');
    if (sampleBtn) sampleBtn.addEventListener('click', toggleSample);

    // dark mode toggle logic
    const toggle = document.getElementById('dark-toggle');
    toggle.addEventListener('change', () => {
        document.body.classList.toggle('dark', toggle.checked);
        saveState();
    });

    // load saved semesters and theme
    loadState();
    // if none exist, create default then populate the selector
    if (Object.keys(semesters).length === 0) {
        semesters['Default'] = [];
    }
    populateSemesterList();
    // select first semester
    currentSemester = Object.keys(semesters)[0];
    loadCurrentSemester();

    // if no preference stored, honor system setting
    if (!localStorage.getItem('gpa_dark')) {
        const prefers = window.matchMedia('(prefers-color-scheme: dark)').matches;
        document.body.classList.toggle('dark', prefers);
        toggle.checked = prefers;
    }

    // fill in conversion info tables
    populateScaleInfo();
}


window.addEventListener('DOMContentLoaded', init);
