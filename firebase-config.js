// Import the functions you need from the SDKs you need
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getAnalytics } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-analytics.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
import { getStorage } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-storage.js";

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyDO0N82vMalBzbNtNI0qHH-7paw6UQT9zM",
  authDomain: "invoiding-database.firebaseapp.com",
  projectId: "invoiding-database",
  storageBucket: "invoiding-database.firebasestorage.app",
  messagingSenderId: "652678242016",
  appId: "1:652678242016:web:eec953d046ae53e7f53a85",
  measurementId: "G-Y2X66C8B22"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);

// Initialize Firestore Database and Export it
export const db = getFirestore(app);

// Initialize Firebase Storage and Export it
export const storage = getStorage(app);