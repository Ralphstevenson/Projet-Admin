// ============================================================
// ECHANJ PLUS - ADMIN CORE JS (MODULE SYSTEM)
// ============================================================

// 1. IMPORT FIREBASE SDK v10 (ES MODULES)
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { 
    getAuth, 
    signInWithEmailAndPassword, 
    onAuthStateChanged, 
    signOut 
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { 
    getDatabase, 
    ref, 
    onValue, 
    update 
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-database.js";

// 2. FIREBASE CONFIGURATION (ECHANJ PLUS)
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

// 3. INITIALIZE FIREBASE
const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getDatabase(app);

// ADMIN CREDENTIALS (DAPRE REALTIME RULES AK AUTHENTICATION FIREBASE OU AN)
const ADMIN_UID = "GcwF8Iv8GqaAhSDRvTeZajzMvG23";
const ADMIN_EMAIL = "echanjplus@gmail.com";

// 4. ELEMENT DOM YO
const authScreen = document.getElementById('auth-screen');
const adminPanel = document.getElementById('admin-panel');
const loginForm = document.getElementById('admin-login-form');
const authErrorMsg = document.getElementById('auth-error-msg');
const btnLogout = document.getElementById('btn-logout');

// ============================================================
// 5. LOJIK AUTHENTIFICATION & PWOTEKSYON AKSÈ
// ============================================================

// Koute Lè Yon Moun Konekte Oswa Dekonekte
onAuthStateChanged(auth, async (user) => {
    if (user) {
        // Verifikasyon sou UID oswa sou Imèl Admin lan
        const isCorrectUid = user.uid === ADMIN_UID;
        const isCorrectEmail = user.email && user.email.toLowerCase() === ADMIN_EMAIL.toLowerCase();

        if (isCorrectUid || isCorrectEmail) {
            // Se Admin prensipal la! Montre Panèl la
            authScreen.classList.add('hidden');
            adminPanel.classList.remove('hidden');
            
            // Rele motè prensipal Admin lan
            initAdminApp();
        } else {
            // Se pa kont Admin lan! Blokel epi dekonekte l
            showError("Aksè Refize! Kont sa a pa gen pèmisyon Admin.");
            await signOut(auth);
            showAuthScreen();
        }
    } else {
        // Pa gen moun ki konekte -> Voye l sou ekran Login
        showAuthScreen();
    }
});

// Formulaire Login Submission
if (loginForm) {
    loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const email = document.getElementById('admin-email').value.trim();
        const password = document.getElementById('admin-password').value.trim();

        hideError();
        
        try {
            await signInWithEmailAndPassword(auth, email, password);
            // Sou siksè, `onAuthStateChanged` ap deklenche otomatikman.
        } catch (error) {
            showError("Imèl oswa modpas la pa korèk!");
        }
    });
}

// Lojik Dekoneksyon (Logout)
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

// ============================================================
// 6. JESTYON NAVIGASYON SOU PYE SIT LA (BOTTOM NAV)
// ============================================================
document.querySelectorAll('.bottom-nav .nav-item').forEach(item => {
    item.addEventListener('click', () => {
        // Retire klas active sou tout boutton anba yo
        document.querySelectorAll('.bottom-nav .nav-item').forEach(i => i.classList.remove('active'));
        
        // Kache tout seksyon yo
        document.querySelectorAll('.admin-section').forEach(s => s.classList.add('hidden'));

        // Mete klas active sou boutton ki klike a
        item.classList.add('active');
        
        // Afiche sèlman seksyon ki koresponn lan
        const targetSection = item.getAttribute('data-target');
        const sectionElem = document.getElementById(targetSection);
        if (sectionElem) {
            sectionElem.classList.remove('hidden');
        }
    });
});

// ============================================================
// 7. FONKSYON PRENSIPAL LÈ ADMIN AN FIN KONEKTE
// ============================================================
function initAdminApp() {
    console.log("Sistèm Admin Echanj Plus Pare ak Siksè!");
    // Seksyon kòd pou Akèy, Echanj, Retrè, Istorik ak Chat pral ploge la
}