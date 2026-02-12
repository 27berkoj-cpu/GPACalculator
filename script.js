// manage classes array
const classes = [];

function parseGrade(input) {
    const num = parseFloat(input);
    if (isNaN(num)) return null;
    if (num <= 4) {
        return num;
    }
    // assume percent
    return (num / 100) * 4;
}

function updateTable() {
    const tbody = document.querySelector('#class-table tbody');
    tbody.innerHTML = '';
    if (classes.length === 0) return;

    // find highest and lowest scale grades (after weight added)
    let max = -Infinity, min = Infinity;
    classes.forEach(c => {
        const val = c.scale + (c.weighted ? 1 : 0);
        if (val > max) max = val;
        if (val < min) min = val;
    });

    classes.forEach((c, idx) => {
        const tr = document.createElement('tr');
        const scaleWithBonus = (c.scale + (c.weighted ? 1 : 0)).toFixed(2);
        if (scaleWithBonus == max) tr.classList.add('highest');
        if (scaleWithBonus == min) tr.classList.add('lowest');

        tr.innerHTML = `
            <td>${idx + 1}</td>
            <td>${c.input} (${scaleWithBonus})</td>
            <td>${c.credit}</td>
            <td>${c.weighted ? 'Yes' : 'No'}</td>
        `;
        tbody.appendChild(tr);
    });
}

function addClass() {
    const gradeInput = document.getElementById('grade');
    const creditInput = document.getElementById('credit');
    const weight = document.querySelector('input[name="weight"]:checked').value;

    const parsed = parseGrade(gradeInput.value);
    const credit = parseFloat(creditInput.value);
    if (parsed === null || isNaN(credit) || credit <= 0) {
        alert('Please enter valid grade and credit hours.');
        return;
    }

    classes.push({
        input: gradeInput.value,
        scale: parsed,
        credit: credit,
        weighted: weight === 'weighted',
    });
    gradeInput.value = '';
    creditInput.value = '';
    document.getElementById('grade').focus();

    updateTable();
}

function calculateGPA() {
    if (classes.length === 0) {
        alert('No classes added.');
        return;
    }
    let totalPoints = 0;
    let totalCredits = 0;

    classes.forEach(c => {
        const pts = (c.scale + (c.weighted ? 1 : 0)) * c.credit;
        totalPoints += pts;
        totalCredits += c.credit;
    });

    const gpa = totalPoints / totalCredits;
    document.getElementById('gpa-output').textContent = `Cumulative GPA: ${gpa.toFixed(2)}`;
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
