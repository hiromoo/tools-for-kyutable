'use strict';

import { getSubjectsFromTimetable } from "./timetableScraper";

function getHTML() {
    return document.children[0].outerHTML;
}

(() => {
    chrome.runtime.onMessage.addListener(async function (message, sender, sendResponse) {
        const method = message['method'];
        switch (method) {
            case 'getHTML':
                sendResponse(getHTML());
                return true;
            case 'getSubjects':
                sendResponse(getSubjectsFromTimetable());
                return true;
            default:
                return false;
        }
    });
})();