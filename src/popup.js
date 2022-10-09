'use strict';

import './popup.css';
import { initFirebaseApp } from './firebaseInitializer';
import { getAuth, onAuthStateChanged } from 'firebase/auth';

const firebaseApp = initFirebaseApp();
const auth = getAuth(firebaseApp);

(() => {
  window.addEventListener('load', function () {
    onAuthStateChanged(auth, user => {
      if (user) {
        // User is signed in.
        window.location.href = 'main.html';
      } else {
        // User is signed out.
        window.location.href = 'signin.html';
      }
    }, function (error) {
      console.log(error);
    });
  });
})();