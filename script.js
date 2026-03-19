import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getAuth, signInWithEmailAndPassword, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { getDatabase, ref, onValue, update, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-database.js";

// 1. Konfigirasyon Firebase ou bay la
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

// SEKIRITE: Sèl UID ki gen dwa antre
const MASTER_UID = "GcWF8Iv8GqaAhSDRVteZajzMvG23";

// 2. GADYEN AKSÈ (onAuthStateChanged)
onAuthStateChanged(auth, (user) => {
    const loginOverlay = document.getElementById('login-overlay');
    const adminPanel = document.getElementById('main-admin-panel');

    if (user && user.uid === MASTER_UID) {
        // Si se ou menm: Louvri pòt la
        loginOverlay.classList.add('hidden');
        adminPanel.classList.remove('hidden');
        
        // Lojik 2: Mete Admin Online
        update(ref(db, 'status/admin'), { 
            state: "online", 
            last_changed: serverTimestamp() 
        });

        lanseStatistikYo();
    } else {
        // Si se pa ou: Fèmen pòt la
        if (user) signOut(auth); 
        loginOverlay.classList.remove('hidden');
        adminPanel.classList.add('hidden');
    }
});

// 3. LOJIK BOUTON KONEKTE
document.getElementById('btn-login').onclick = async () => {
    const email = document.getElementById('admin-email').value.trim();
    const pass = document.getElementById('admin-pass').value.trim();
    const btn = document.getElementById('btn-login');
    const errorMsg = document.getElementById('auth-error');

    if (!email || !pass) {
        errorMsg.innerText = "Ranpli tout chan yo!";
        errorMsg.classList.remove('hidden');
        return;
    }

    btn.disabled = true;
    btn.innerHTML = '<i class="fa fa-spinner fa-spin"></i> Verifikasyon...';

    try {
        await signInWithEmailAndPassword(auth, email, pass);
    } catch (error) {
        btn.disabled = false;
        btn.innerHTML = 'Konekte <i class="fa fa-sign-in-alt"></i>';
        errorMsg.innerText = "Email oswa Modpas enkòrèk!";
        errorMsg.classList.remove('hidden');
    }
};

// 4. LOJIK STATISTIK (Lojik 3 & 12)
function lanseStatistikYo() {
    const dbRef = ref(db, '/');
    
    onValue(dbRef, (snapshot) => {
        const data = snapshot.val();
        if (!data) return;

        const users = data.users || {};
        const transactions = data.transactions || {};

        let balansKès = 0;
        let antreJodi = 0;
        let pwofiTotal = 0;

        // Jwenn dat jodi a (DD/MM/YYYY)
        const jodiA = new Date().toDateString();

        // A. Kalkile Balans Kliyan (Lojik 3)
        Object.values(users).forEach(u => {
            balansKès += Number(u.balance || 0);
        });

        // B. Kalkile Tranzaksyon Validé (Lojik 12)
        Object.values(transactions).forEach(t => {
            if (t.status === "Validé") {
                const montan = Number(t.amount || 0);
                
                // Pwofi = 0.5% sou chak tranzaksyon validé
                pwofiTotal += montan * 0.005;

                // Si depo a fèt jodi a
                const datTrans = new Date(t.timestamp || Date.now()).toDateString();
                if (t.type === "Depo" && datTrans === jodiA) {
                    antreJodi += montan;
                }
            }
        });

        // C. Mete yo nan HTML la
        document.getElementById('total-balance').innerText = balansKès.toLocaleString() + " HTG";
        document.getElementById('today-in').innerText = antreJodi.toLocaleString() + " HTG";
        document.getElementById('total-profit').innerText = pwofiTotal.toLocaleString() + " HTG";
    });
}

// 5. LOJIK LOGOUT
document.getElementById('btn-logout').onclick = () => {
    update(ref(db, 'status/admin'), { state: "offline" });
    signOut(auth);
};
      
