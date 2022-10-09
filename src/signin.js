'use strict';

import './signin.css';
import 'firebaseui/dist/firebaseui.css';
import { initFirebaseApp } from './firebaseInitializer';
import firebase from 'firebase/compat/app';

async function importFirebaseui() {
    const lang = navigator.language;
    return lang.includes('en') ? await import('./npm__en')
        : lang.includes('ja') ? await import('./npm__ja')
            : await import('firebaseui');
}

(() => {
    window.addEventListener('load', async function () {
        initFirebaseApp();
        const firebaseui = await importFirebaseui();
        var ui = new firebaseui.auth.AuthUI(firebase.auth());
        ui.start('#firebaseui-auth-container', {
            signInOptions: [
                firebase.auth.EmailAuthProvider.PROVIDER_ID
            ],
            signInSuccessUrl: 'main.html'
        });
    });
})();