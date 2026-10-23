import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';

const firebaseConfig = {
    apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY || "AIzaSyDlvlhKHyyjfxAVgTSxuBSGdDB5qquVk6c",
    authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || "xacai-delivery-prod.firebaseapp.com",
    projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || "xacai-delivery-prod",
    storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || "xacai-delivery-prod.firebasestorage.app",
    messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || "1077201570871",
    appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID || "1:1077201570871:web:7d43569d16344c94bb03b2"
};

const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
let auth: any;
try {
    auth = getAuth(app);
} catch (e) {
    console.warn('Firebase getAuth warning during build/prerender:', e);
}

export { app, auth };
