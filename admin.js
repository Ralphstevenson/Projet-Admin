import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getAuth, signInWithEmailAndPassword, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { getDatabase, ref, onValue } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-database.js";

// Konfigirasyon ou an
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
const auth = getAuth(app);
const db = getDatabase(app);

const MASTER_UID = "GcWF8Iv8GqaAhSDRVteZajzMvG23";

// Atann paj la chaje nèt anvan n chèche bouton an
window.onload = () => {
    const btn = document.getElementById('btn-login');
    const emailInput = document.getElementById('admin-email');
    const passInput = document.getElementById('admin-pass');
    const errorMsg = document.getElementById('auth-error');

    if (btn) {
        console.log("Bouton jwenn!");
        btn.onclick = async () => {
            const email = emailInput.value.trim();
            const pass = passInput.value.trim();

            if (!email || !pass) {
                errorMsg.innerText = "Ranpli tout chan yo!";
                return;
            }

            btn.innerText = "Verifikasyon...";
            btn.disabled = true;

            try {
                await signInWithEmailAndPassword(auth, email, pass);
                console.log("Koneksyon fèt!");
            } catch (error) {
                console.error("Erè Firebase:", error.code);
                errorMsg.innerText = "Email oswa Modpas enkòrèk!";
                btn.innerText = "Konekte";
                btn.disabled = false;
            }
        };
    } else {
        console.error("Mwen pa jwenn bouton 'btn-login' nan HTML la!");
    }
};

// Obsevè pou debloke Dashboard la
onAuthStateChanged(auth, (user) => {
    if (user && user.uid === MASTER_UID) {
        document.getElementById('login-overlay').classList.add('hidden');
        document.getElementById('main-admin-panel').classList.remove('hidden');
    }
});
