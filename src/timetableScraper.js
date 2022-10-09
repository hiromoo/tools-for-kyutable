export function getSubjectsFromTimetable() {
    const year = Number(document.getElementsByName('jikanwariSchoolYear')[0].value);
    const semester = [...document.getElementsByName('jikanwariSemesterCode')[0].options].filter(option => option.selected)[0].innerText;
    const timetable = document.getElementsByClassName('tableBdr')[0];
    const subjects = [];
    for (let i = 1; i <= 5; i++) {
        for (let j = 1; j <= 5; j++) {
            const subjectsCell = timetable.rows[i].cells[j];
            const divs = subjectsCell.getElementsByClassName('timeTableSubject2');
            for (const div of [...divs]) {
                if (div.children.length > 0) {
                    const rows = div.children[0].rows;
                    const subjectCell = rows[rows.length - 1].cells[0];
                    const subjectCode = subjectCell.innerHTML.match(/kamokuCode=(.+?)&/)[1];
                    const classCode = subjectCell.innerHTML.match(/classCode=(.+?)&/)[1];
                    const subjectInfo = subjectCell.innerText.split('\n').map(s => s.trim()).filter(s => s !== '');
                    const title = subjectInfo[0];
                    const quarterText = subjectInfo[2];
                    const quarterNumberString = quarterText !== undefined
                        ? quarterText.match(/\(第([１-４])クォーター\)/)[1]
                        : null;
                    const quarter = quarterNumberString !== null
                        ? Number(
                            quarterNumberString.replace(
                                /[１-４]/,
                                s => String.fromCharCode(s.charCodeAt(0) - 0xFEE0)
                            )// 全角数字 -> 半角数字
                        )
                        : null;
                    const quarters = quarter != null
                        ? [quarter]
                        : semester === '前期'
                            ? [1, 2]
                            : semester === '後期'
                                ? [3, 4]
                                : [];
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
    return subjects;
}