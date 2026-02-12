// manage classes array
const classes = [];

// helper: map percentage to letter grade
function letterFromPercent(pct) {

// boundaries for percent to letter (standard breaks)
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
    }
};

function pointsFor(letter, type) {
    const table = gradeTable[type] || gradeTable.regular;
    return table[letter] ?? 0;
}

function updateTable() {
    const tbody = document.querySelector('#class-table tbody');
    tbody.innerHTML = '';
    if (classes.length === 0) return;

    // compute highest/lowest based on points (scale)
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
        `;
        tbody.appendChild(tr);
    });
}

function addClass() {
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

    nameInput.value = '';
    gradeInput.value = '';
    creditInput.value = '';
    document.getElementById('classname').focus();

    updateTable();
}

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

    const gpa = totalPoints / totalCredits;
    const gpaUnw = totalPointsUnw / totalCredits;
    document.getElementById('gpa-output').textContent = `Weighted GPA: ${gpa.toFixed(3)}`;
    document.getElementById('unweighted-output').textContent = `Unweighted GPA: ${gpaUnw.toFixed(3)}`;
}

function clearAll() {
    classes.length = 0;
    document.getElementById('gpa-output').textContent = '';
    updateTable();
}

function init() {
    document.getElementById('add-class').addEventListener('click', addClass);
    document.getElementById('calculate').addEventListener('click', calculateGPA);
    document.getElementById('clear-all').addEventListener('click', clearAll);
}

window.addEventListener('DOMContentLoaded', init);
