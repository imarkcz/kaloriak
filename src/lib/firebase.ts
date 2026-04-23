import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

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
export const db = getFirestore(app);
export const googleProvider = new GoogleAuthProvider();
