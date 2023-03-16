'use strict';

import './main.css';
import { initFirebaseApp } from './firebaseInitializer';
import { getAuth, signOut, onAuthStateChanged } from 'firebase/auth';
import { collection, deleteDoc, doc, getDoc, getDocs, getFirestore, limit, orderBy, query, setDoc, Timestamp, where } from 'firebase/firestore';
import { v4 as uuidv4 } from 'uuid';
import format from 'format-duration';

const timetableUrl = 'https://virginia.jimu.kyutech.ac.jp/portal/jikanwariInit.do';
const notificationManagerUrl = 'https://kyutable-notifications-manager.hirokimt525.repl.co';
const firebaseApp = initFirebaseApp();
const auth = getAuth(firebaseApp);
const db = getFirestore(firebaseApp);
const xhr = new XMLHttpRequest();

let currentTab;
let userSettings;

function onSignOutButtonClick() {
    signOut(auth);
}

function onGoToLiveCampusButtonClick() {
    chrome.tabs.create({
        url: 'https://virginia.jimu.kyutech.ac.jp/'
    });
}

async function onGetSubjectsButtonClick() {
    const getSubjectsButton = document.getElementById('getsubjectsbtn');
    getSubjectsButton.disabled = 'disabled';
    const user = auth.currentUser;
    if (!user) {
        alert('You are not signed in.');
        getSubjectsButton.disabled = null;
        return;
    }
    const subjects = await getSubjects();
    if (subjects === null) {
        alert('Failed to get subjects.');
        return;
    }

    for (const subject of subjects) {
        const year = subject.year;
        const quarter = subject.quarter;
        const weekday = subject.weekday;
        const period = subject.period;
        const subjectsRef = collection(db, 'users', user.uid, 'subjects');
        const subjectsQuerySnapshot = await getDocs(query(
            subjectsRef,
            where('year', '==', year),
            where('quarter', '==', quarter),
            where('weekday', '==', weekday),
            where('period', '==', period)
        ));
        for (const subjectSnapshot of subjectsQuerySnapshot.docs) {
            for (const eventId of subjectSnapshot.data().eventIds) {
                await deleteDoc(doc(db, 'users', user.uid, 'events', eventId));
                xhr.open('POST', notificationManagerUrl);
                xhr.send(JSON.stringify({
                    idToken: await user.getIdToken(),
                    method: 'deleteEventNotification',
                    data: {
                        eventId: eventId
                    }
                }));
            }
            await deleteDoc(subjectSnapshot.ref);
        }
        const generatesEventsAutomatically = document.getElementById('generateseventsautomatically').checked;
        if (generatesEventsAutomatically) {
            const events = await generateEventsFromSubject(subject);
            for (const event of events) {
                await setDoc(doc(db, 'users', user.uid, 'events', event.id), event);
                event.startDateTime = event.startDateTime.toDate().toISOString();
                xhr.open('POST', notificationManagerUrl);
                xhr.send(JSON.stringify({
                    idToken: await user.getIdToken(),
                    method: 'setEventNotification',
                    data: {
                        event: event
                    }
                }));
            }
            subject.eventIds = events.map(event => event.id);
        } else {
            subject.notificationTimeMinutes = null;
            subject.eventIds = [];
        }
        await setDoc(doc(db, 'users', user.uid, 'subjects', subject.id), subject);
    }
    alert('Saved subjects successfully.');
    getSubjectsButton.disabled = null;
}

function onGeneratesEventsAutomaticallyCheckboxChange() {
    const notificationDiv = document.getElementById('notification');
    if (this.checked) {
        notificationDiv.style.display = 'block';
    } else {
        notificationDiv.style.display = 'none';
    }
}

function onDurationNumChange() {
    if (this.value < 0) {
        this.value = 0;
    }
}

function onNotificationEnabledCheckboxChange() {
    if (this.checked) {
        document.getElementById('durationnum').disabled = null;
        document.getElementById('duration-select').disabled = null;
    } else {
        document.getElementById('durationnum').disabled = 'disabled';
        document.getElementById('duration-select').disabled = 'disabled';
    }
}

async function getCurrentTab() {
    let queryOptions = { active: true, lastFocusedWindow: true };
    // `tab` will either be a `tabs.Tab` instance or `undefined`.
    let [tab] = await chrome.tabs.query(queryOptions);
    return tab !== undefined ? tab : null;
}

function getDurationInMinutes(durationNum, durationTersity) {
    switch (durationTersity) {
        case 'minutes':
            return durationNum;
        case 'hours':
            return durationNum * 60;
        case 'days':
            return durationNum * 24 * 60;
        case 'weeks':
            return durationNum * 7 * 24 * 60;
        default:
            return durationNum;
    }
}

async function getSubjects() {
    const user = auth.currentUser;
    if (!user) {
        return null;
    }
    const subjects = await chrome.tabs.sendMessage(
        currentTab.id,
        { method: 'getSubjects' }
    );
    const syllabusesRef = collection(db, 'syllabuses');
    for (let i = 0; i < subjects.length; i++) {
        const subject = subjects[i];
        const syllabusesQuerySnapshot = await getDocs(
            query(
                syllabusesRef,
                where('year', '==', subject.year),
                where('code', '==', subject.code),
                where('class', '==', subject.class)
            )
        );
        const syllabus = syllabusesQuerySnapshot.docs[0]?.data();
        let weekdayAndPeriodIndex;
        for (let j = 0; j < syllabus?.weekdayAndPeriods?.length ?? 0; j++) {
            const weekdayAndPeriod = syllabus.weekdayAndPeriods[j];
            const weekday = weekdayAndPeriod.weekday;
            const period = weekdayAndPeriod.period;
            if (weekday === subject.weekday && period === subject.period) {
                weekdayAndPeriodIndex = j;
                break;
            }
        }
        const id = uuidv4();
        subjects[i].id = id;
        const place = syllabus?.places[weekdayAndPeriodIndex]
            ?? syllabus?.places[0]
            ?? null
        subjects[i].place = place;
        const isNotificationEnabled = document.getElementById('notificationenabled').checked;
        if (isNotificationEnabled) {
            const notificationDurationNum = Number(document.getElementById('durationnum').value);
            const durationSelect = document.getElementById('duration-select');
            const notificationDurationTersityIndex = durationSelect.selectedIndex;
            const notificationDurationTersityValue = durationSelect.options[notificationDurationTersityIndex].value;
            const notificationTimeMinutes = -getDurationInMinutes(notificationDurationNum, notificationDurationTersityValue);
            subjects[i].notificationTimeMinutes = notificationTimeMinutes;
        } else {
            subjects[i].notificationTimeMinutes = null;
        }
    }
    return subjects;
}

function getQuartersDateRangeFromDate(date) {
    const filteredQuartersDateRanges = Object.values(userSettings.yearsQuartersDateRange).filter(quartersDateRange => {
        const endDate = quartersDateRange.q4.end.toDate();
        endDate.setDate(endDate.getDate() + 1);
        return date < endDate;
    });
    if (!filteredQuartersDateRanges.length) return null;
    filteredQuartersDateRanges.sort((a, b) => a.q1.start.getTime() - b.q1.start.getTime());
    return filteredQuartersDateRanges[0];
}

function getDateRangeFromQuarter(quartersDateRange, quarter) {
    switch (quarter) {
        case 1:
            return quartersDateRange.q1;
        case 2:
            return quartersDateRange.q2;
        case 3:
            return quartersDateRange.q3;
        case 4:
            return quartersDateRange.q4;
        default:
            return null;
    }
}

async function generateEventsFromSubject(subject) {
    const events = [];
    const title = subject.title;
    const place = subject.place;
    const notificationTimeMinutes = subject.notificationTimeMinutes;
    const description = subject.description;
    const year = subject.year;
    const quarter = subject.quarter;
    const weekday = subject.weekday;
    const period = subject.period;
    if (userSettings.yearsQuartersDateRange[year] === undefined) {
        userSettings.yearsQuartersDateRange[year] = await getQuartersDateRange(year);
    }
    const quartersDateRange = userSettings.yearsQuartersDateRange[year];
    const dateRange = getDateRangeFromQuarter(quartersDateRange, quarter);
    const timeRange = userSettings.periodsTimeRange[period];
    const date = dateRange.start.toDate();
    date.setDate(date.getDate() + (weekday - date.getDay() + 7) % 7);
    const endDate = dateRange.end.toDate();
    endDate.setDate(endDate.getDate() + 1);
    for (; date < endDate; date.setDate(date.getDate() + 7)) {
        const startDateTime = new Date(
            date.getFullYear(),
            date.getMonth(),
            date.getDate(),
            timeRange.start.toDate().getHours(),
            timeRange.start.toDate().getMinutes()
        );
        const endDateTime = new Date(
            date.getFullYear(),
            date.getMonth(),
            date.getDate(),
            timeRange.end.toDate().getHours(),
            timeRange.end.toDate().getMinutes()
        );
        const eventId = uuidv4();
        events.push({
            id: eventId,
            title: title,
            startDateTime: Timestamp.fromDate(startDateTime),
            endDateTime: Timestamp.fromDate(endDateTime),
            place: place,
            notificationTimeMinutes: notificationTimeMinutes,
            description: description
        });
    }
    return events;
}

function getDefaultNotificationTimeMinutes() {
    return -30;
}

function getDefaultPeriodsTimeRange() {
    return {
        1: {
            start: Timestamp.fromDate(new Date(1970, 0, 1, 8, 50)),
            end: Timestamp.fromDate(new Date(1970, 0, 1, 10, 20))
        },
        2: {
            start: Timestamp.fromDate(new Date(1970, 0, 1, 10, 30)),
            end: Timestamp.fromDate(new Date(1970, 0, 1, 12, 0))
        },
        3: {
            start: Timestamp.fromDate(new Date(1970, 0, 1, 13, 0)),
            end: Timestamp.fromDate(new Date(1970, 0, 1, 14, 30))
        },
        4: {
            start: Timestamp.fromDate(new Date(1970, 0, 1, 14, 40)),
            end: Timestamp.fromDate(new Date(1970, 0, 1, 16, 10))
        },
        5: {
            start: Timestamp.fromDate(new Date(1970, 0, 1, 16, 20)),
            end: Timestamp.fromDate(new Date(1970, 0, 1, 17, 50))
        }
    };
}

async function getQuartersDateRange(year) {
    const quartersDateRangeQuerySnapshot = await getDoc(doc(db, `quarters_date_range/${year}`));
    return quartersDateRangeQuerySnapshot.data();
}

async function getDefaultUserSettings() {
    return {
        notificationTimeMinutes: getDefaultNotificationTimeMinutes(),
        periodsTimeRange: getDefaultPeriodsTimeRange(),
        yearsQuartersDateRange: {}
    };
}

(() => {
    window.addEventListener('load', async function () {
        document
            .getElementById('signoutbtn')
            .addEventListener("click", onSignOutButtonClick);
        document
            .getElementById('gotolivecampusbtn')
            .addEventListener("click", onGoToLiveCampusButtonClick);
        document
            .getElementById('getsubjectsbtn')
            .addEventListener("click", onGetSubjectsButtonClick);
        document
            .getElementById('generateseventsautomatically')
            .addEventListener("change", onGeneratesEventsAutomaticallyCheckboxChange);
        document
            .getElementById('notificationenabled')
            .addEventListener("change", onNotificationEnabledCheckboxChange);
        const durationNumInput = document.getElementById('durationnum');
        durationNumInput.addEventListener("change", onDurationNumChange);
        onAuthStateChanged(auth, async user => {
            if (user) {
                const userSettingsDocSnapshot = await getDoc(doc(db, 'user_settings', user.uid));
                userSettings = userSettingsDocSnapshot.exists()
                    ? userSettingsDocSnapshot.data()
                    : await getDefaultUserSettings();
                const durationNums = format(Math.abs(userSettings.notificationTimeMinutes) * 60 * 1000).split(':').map(n => Number(n));
                const weeksNum = durationNums.length === 4 ? Math.floor(durationNums[0] / 7) : 0;
                durationNumInput.value = weeksNum > 0 ? weeksNum : durationNums[0];
                document.getElementById('duration-select').selectedIndex = weeksNum > 0 ? weeksNum : durationNums.length - 2;
            } else {
                // User is signed out.
                window.location.href = 'signin.html';
            }
        }, (error) => {
            console.log(error);
        });

        currentTab = await getCurrentTab();
        if (currentTab !== null && currentTab.url.includes(timetableUrl)) {
            document.getElementById('getsubjectsbtn').disabled = false;
        }
    });
})();