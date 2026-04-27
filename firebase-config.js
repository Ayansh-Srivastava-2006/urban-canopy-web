import { initializeApp } from "https://www.gstatic.com/firebasejs/10.9.0/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/10.9.0/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.9.0/firebase-firestore.js";
import { getDatabase } from "https://www.gstatic.com/firebasejs/10.9.0/firebase-database.js";

const firebaseConfig = {
  apiKey: "AIzaSyBnqigdz1UKUktnRH8JGLbqrf5xnPBGr8A",
  authDomain: "urban-canopy-solution.firebaseapp.com",
  databaseURL: "https://urban-canopy-solution-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "urban-canopy-solution",
  storageBucket: "urban-canopy-solution.firebasestorage.app",
  messagingSenderId: "162241789831",
  appId: "1:162241789831:web:666081e34135a81f6e1d22",
  measurementId: "G-2YHSM70NPK"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const realtimeDb = getDatabase(app);

export { auth, db, realtimeDb };
