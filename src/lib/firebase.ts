import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider } from 'firebase/auth';
import { initializeFirestore, persistentLocalCache, persistentMultipleTabManager } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: 'AIzaSyDj27Q2m98NGz_yMuzhhQBkjfIU-gW7CjY',
  authDomain: 'kaloriak-f6e8c.firebaseapp.com',
  projectId: 'kaloriak-f6e8c',
  storageBucket: 'kaloriak-f6e8c.firebasestorage.app',
  messagingSenderId: '799570209700',
  appId: '1:799570209700:web:d5f38a1f861f4c75b2ef31',
};

export const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);

// Persistent local cache: writes land in IndexedDB immediately and the SDK
// delivers them itself once there is signal, surviving app kill. This is what
// makes the hand-rolled retry / pagehide-flush / daily-snapshot machinery
// unnecessary — and it stops a request killed by backgrounding the PWA from
// surfacing as "sync failed" when nothing was actually lost.
export const db = initializeFirestore(app, {
  localCache: persistentLocalCache({ tabManager: persistentMultipleTabManager() }),
});

export const googleProvider = new GoogleAuthProvider();
