'use strict';

import firebase from 'firebase/compat/app';
import { initializeApp } from 'firebase/app';

export function initFirebaseApp() {
    const firebaseConfig = {
        apiKey: "AIzaSyCsRVmQpZGzBan0SZgaT7dD6WcLK7X2uv8",
        authDomain: "kyutable.firebaseapp.com",
        projectId: "kyutable",
        storageBucket: "kyutable.appspot.com",
        messagingSenderId: "133992111238",
        appId: "1:133992111238:web:88c95d243ea6b0d48f8507",
        measurementId: "G-K3C5RBNRDG"
    };
    firebase.initializeApp(firebaseConfig);// v8
    return initializeApp(firebaseConfig);// v9
};