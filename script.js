// ============================================================
// ECHANJ PLUS - ADMIN CORE JS (admin.js)
// ============================================================

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { 
    getAuth, 
    signInWithEmailAndPassword, 
    onAuthStateChanged, 
    signOut 
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { getDatabase } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-database.js";

// ENPÒTE LOJIK SEKSYON AKÈY LA
import { initAkeySection } from "./akey.js";

// FIREBASE CONFIGURATION
const firebaseConfig = {
  apiKey: "AIzaSyB1VTPakleoggsbLdpm_HS7nSb3A7A99Qw",
  authDomain: "echanj-plus-778cd.firebaseapp.com",
  databaseURL: "https://echanj-plus-778cd-default-rtdb.firebaseio.com",
  projectId: "echanj-plus-778cd",
  storageBucket: "echanj-plus-778cd.firebasestorage.app",
  messagingSenderId: "111144762929",
  appId: "1:111144762929:web:e64ce9a6da65781c289f10",
  measurementId: "G-J1BQRF32ZW"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getDatabase(app);

const ADMIN_UID = "GcwF8Iv8GqaAhSDRvTeZajzMvG23";
const ADMIN_EMAIL = "echanjplus@gmail.com";

const authScreen = document.getElementById('auth-screen');
const adminPanel = document.getElementById('admin-panel');
const loginForm = document.getElementById('admin-login-form');
const authErrorMsg = document.getElementById('auth-error-msg');
const btnLogout = document.getElementById('btn-logout');

// AUTH SYSTEM
onAuthStateChanged(auth, async (user) => {
    if (user) {
        const isCorrectUid = user.uid === ADMIN_UID;
        const isCorrectEmail = user.email && user.email.toLowerCase() === ADMIN_EMAIL.toLowerCase();

        if (isCorrectUid || isCorrectEmail) {
            authScreen.classList.add('hidden');
            adminPanel.classList.remove('hidden');
            
            // DEMARE SÈVIS YO
            initAdminApp();
        } else {
            showError("Aksè Refize! Kont sa a pa gen pèmisyon Admin.");
            await signOut(auth);
            showAuthScreen();
        }
    } else {
        showAuthScreen();
    }
});

if (loginForm) {
    loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const email = document.getElementById('admin-email').value.trim();
        const password = document.getElementById('admin-password').value.trim();
        hideError();
        try {
            await signInWithEmailAndPassword(auth, email, password);
        } catch (error) {
            showError("Imèl oswa modpas la pa korèk!");
        }
    });
}

if (btnLogout) {
    btnLogout.addEventListener('click', async () => {
        await signOut(auth);
        location.reload();
    });
}

function showAuthScreen() {
    authScreen.classList.remove('hidden');
    adminPanel.classList.add('hidden');
}

function showError(msg) {
    authErrorMsg.innerText = msg;
    authErrorMsg.classList.remove('hidden');
}

function hideError() {
    authErrorMsg.innerText = "";
    authErrorMsg.classList.add('hidden');
}

// BOTTOM NAV LOGIC
document.querySelectorAll('.bottom-nav .nav-item').forEach(item => {
    item.addEventListener('click', () => {
        document.querySelectorAll('.bottom-nav .nav-item').forEach(i => i.classList.remove('active'));
        document.querySelectorAll('.admin-section').forEach(s => s.classList.add('hidden'));

        item.classList.add('active');
        
        const targetSection = item.getAttribute('data-target');
        const sectionElem = document.getElementById(targetSection);
        if (sectionElem) {
            sectionElem.classList.remove('hidden');
        }
    });
});

// INITIALISATION
function initAdminApp() {
    console.log("Sistèm Admin Echanj Plus Pare!");
    // LOUVRI AKÈY LA PASE PÈT `db` LADDAN L
    initAkeySection(db);
}
