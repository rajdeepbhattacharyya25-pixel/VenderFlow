// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";

// Your web app's Firebase configuration
const firebaseConfig = {
    apiKey: "AIzaSyAbz8c3IkT0OhGXDYzQ_v79SL_-Jha0Aqs",
    authDomain: "e-store-a84f5.firebaseapp.com",
    projectId: "e-store-a84f5",
    storageBucket: "e-store-a84f5.firebasestorage.app",
    messagingSenderId: "682239152995",
    appId: "1:682239152995:web:b34694d90e3bd4c7eab956",
    measurementId: "G-4EHV0X714G"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);

export { auth };
