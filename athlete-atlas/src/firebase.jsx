// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";


// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
    apiKey: "AIzaSyAtsL4ic_GgW-Kn1iQg5xRJfXgw5MIAxZ4",
    authDomain: "athleteatlasauth.firebaseapp.com",
    projectId: "athleteatlasauth",
    storageBucket: "athleteatlasauth.firebasestorage.app",
    messagingSenderId: "910951180360",
    appId: "1:910951180360:web:795961049d23ba906bd07d",
    measurementId: "G-SZ3HTXE5V8"
};

// Inițializare Firebase
const app = initializeApp(firebaseConfig);

// Exportăm funcția de autentificare
export const auth = getAuth(app);
export default app;