export function getSubjectsFromTimetable() {
    const year = Number(document.getElementsByName('jikanwariSchoolYear')[0].value);
    const semester = [...document.getElementsByName('jikanwariSemesterCode')[0].options].filter(option => option.selected)[0].innerText;
    const timetable = document.getElementsByClassName('tableBdr')[0];
    const subjects = [];
    for (let i = 1; i <= 7; i++) {
        for (let j = 1; j <= 5; j++) {
            const subjectsCell = timetable.rows[i].cells[j];
            const divs = subjectsCell.getElementsByClassName('timeTableSubject2');
            for (const div of [...divs]) {
                if (div.children.length > 0) {
                    const rows = div.children[0].rows;
                    const subjectCell = rows[rows.length - 1].cells[0];
                    const subjectCode = getSubjectCodeFromCell(subjectCell);
                    const classCode = getClassCodeFromCell(subjectCell);
                    const subjectInfo = getSubjectInfoFromCell(subjectCell);
                    const title = subjectInfo[0];
                    const quarters = getQuartersFromText(subjectInfo[2], semester);
                    quarters.forEach(quarter =>
                        subjects.push(
                            {
                                title: title,
                                year: year,
                                quarter: quarter,
                                weekday: j,
                                period: i,
                                code: subjectCode,
                                class: classCode,
                                description: null
                            }
                        )
                    );
                }
            }
        }
    }
    const intensiveList = document.getElementsByClassName('tableBdr')[1];
    for (const row of [...intensiveList.rows].slice(1)) {
        const subjectCell = row.cells[0];
        const subjectCode = getSubjectCodeFromCell(subjectCell);
        const classCode = getClassCodeFromCell(subjectCell);
        const subjectInfo = getSubjectInfoFromCell(subjectCell, ' ');
        const title = subjectInfo[0];
        const quarters = getQuartersFromText(subjectInfo[1], semester);
        quarters.forEach(quarter =>
            subjects.push(
                {
                    title: title,
                    year: year,
                    quarter: quarter,
                    isIntensive: true,
                    code: subjectCode,
                    class: classCode,
                    description: null
                }
            )
        );
    }
    return subjects;
}

function getSubjectCodeFromCell(cell) {
    return cell.innerHTML.match(/kamokuCode=(.+?)&/)[1];
}

function getClassCodeFromCell(cell) {
    return cell.innerHTML.match(/classCode=(.+?)&/)[1];
}

function getSubjectInfoFromCell(cell, separator = '\n') {
    return cell.innerText.split(separator).map(s => s.trim()).filter(s => s !== '');
}

function getQuartersFromText(text, semester) {
    const quarterNumberString = text != null
        ? text.match(/\(第([１-４])クォーター\)/)[1]
        : null;
    const quarter = quarterNumberString !== null
        ? Number(
            quarterNumberString.replace(
                /[１-４]/,
                s => String.fromCharCode(s.charCodeAt(0) - 0xFEE0)
            )// 全角数字 -> 半角数字
        )
        : null;
    return quarter !== null
        ? [quarter]
        : semester === '前期'
            ? [1, 2]
            : semester === '後期'
                ? [3, 4]
                : [];
}