import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getAuth, signInWithEmailAndPassword, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
// NOU AJOUTE "push" NAN LIY ANBA SA A
import { getDatabase, ref, onValue, update, get, serverTimestamp, runTransaction, push } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-database.js";

// 1. KONFIGIRASYON
const firebaseConfig = {
    apiKey: "AIzaSyB1VTPakleoggsbLdpm_HS7nSb3A7A99Qw",
    authDomain: "echanj-plus-778cd.firebaseapp.com",
    databaseURL: "https://echanj-plus-778cd-default-rtdb.firebaseio.com",
    projectId: "echanj-plus-778cd",
    storageBucket: "echanj-plus-778cd.firebasestorage.app",
    messagingSenderId: "111144762929",
    appId: "1:111144762929:web:e64ce9a6da65781c289f10"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getDatabase(app);
const MASTER_UID = "GcWF8Iv8GqaAhSDRVteZajzMvG23";

// --- 2. LOGIN FONKSYON ---
window.handleLogin = () => {
    const email = document.getElementById('admin-email').value;
    const pass = document.getElementById('admin-pass').value;
    signInWithEmailAndPassword(auth, email, pass).catch(err => alert("Erè: " + err.message));
};

// --- 3. GADYEN AKSÈ ---
onAuthStateChanged(auth, (user) => {
    if (user && user.uid === MASTER_UID) {
        document.getElementById('login-overlay').classList.add('hidden');
        document.getElementById('main-admin-panel').classList.remove('hidden');
        lanseSistèmKontwòl();
    } else {
        if (user) signOut(auth);
        document.getElementById('login-overlay').classList.remove('hidden');
    }
});

// --- 4. LOJIK STATISTIK & TRANZAKSYON ---
function lanseSistèmKontwòl() {
    onValue(ref(db, '/'), (snapshot) => {
        const data = snapshot.val() || {};
        const users = data.users || {};
        const transactions = data.transactions || {};
        const jodiA = new Date().toDateString();

        let kèsTotal = 0, pwofiTotal = 0, antreJodi = 0, pwofiJodi = 0;

        const listEchanj = document.getElementById('list-pending-echanj');
        const listRetre = document.getElementById('list-pending-retre');
        const listHistory = document.getElementById('list-history');
        const listUsers = document.getElementById('list-users');
        
        if(listEchanj) listEchanj.innerHTML = "";
        if(listRetre) listRetre.innerHTML = "";
        if(listHistory) listHistory.innerHTML = "";
        if(listUsers) listUsers.innerHTML = "";

        // KLIYAN YO
        Object.keys(users).forEach(uid => {
            const u = users[uid];
            kèsTotal += Number(u.balance || 0);
            if(listUsers) {
                listUsers.innerHTML += `
                <tr>
                    <td>${u.arsID || '---'}</td>
                    <td><b>${Number(u.balance).toFixed(2)}</b></td>
                    <td><span class="badge ${u.status}">${u.status}</span></td>
                    <td><button onclick="window.ajisteBalans('${uid}', ${u.balance})">Edit</button></td>
                </tr>`;
            }
        });

        // TRANZAKSYON YO
        Object.keys(transactions).reverse().forEach(tid => {
            const t = transactions[tid];
            const tDate = new Date(t.timestamp).toDateString();
            const montan = parseFloat(t.amount || 0);

            if (t.status === "En attente") {
                // Tcheke si se echanj oswa retrè (nou tcheke tou de fason pou sekirite)
                if (t.type === "Echanj") {
                    if(listEchanj) listEchanj.innerHTML += kreyeLiyTablo(t, tid, "echanj");
                } else if (t.type === "Retrè" || t.type === "Retrait") {
                    if(listRetre) listRetre.innerHTML += kreyeLiyTablo(t, tid, "retre");
                }
            } else if (t.status === "Validé") {
                const benef = montan * 0.005;
                pwofiTotal += benef;
                if (tDate === jodiA) {
                    pwofiJodi += benef;
                    if (t.type === "Echanj") antreJodi += montan;
                }
                if(listHistory) listHistory.innerHTML += `<tr><td>${tDate}</td><td>${t.type}</td><td>${montan}</td><td>${t.status}</td></tr>`;
            }
        });

        document.getElementById('total-balance').innerText = kèsTotal.toLocaleString() + " HTG";
        document.getElementById('today-in').innerText = antreJodi.toLocaleString() + " HTG";
        document.getElementById('total-profit').innerText = Math.floor(pwofiTotal).toLocaleString() + " HTG";
    });
}

function kreyeLiyTablo(t, tid, kategori) {
    let detay = (kategori === "retre") 
        ? `<small>Voye bay: ${t.receiver || '---'}<br>Tel: ${t.phone || '---'} (${t.method})</small>` 
        : `<small>Rezo: ${t.rezo || 'Digicel'}</small>`;

    return `
        <tr>
            <td>${t.arsID || '---'}</td>
            <td>${detay}</td>
            <td><b>${t.amount}</b></td>
            <td>
                <button class="btn-v" onclick="finalize('${tid}', '${t.uid}', ${t.amount}, '${t.type}', 'Validé')">V</button>
                <button class="btn-x" onclick="finalize('${tid}', '${t.uid}', ${t.amount}, '${t.type}', 'Refusé')">X</button>
            </td>
        </tr>`;
}

// --- 5. FINALIZE (KI KORIJÈ) ---
window.finalize = async (tid, uid, amt, type, status) => {
    if (!confirm(`Èske ou vle ${status} tranzaksyon sa a?`)) return;

    try {
        const userRef = ref(db, `users/${uid}/balance`);

        // Si se echanj, ajoute kòb la
        if (type === "Echanj" && status === "Validé") {
            await runTransaction(userRef, (current) => (current || 0) + Number(amt));
        }

        // Si se retrè epi w refize l, remete kòb la (Refund)
        if ((type === "Retrè" || type === "Retrait") && status === "Refusé") {
            await runTransaction(userRef, (current) => (current || 0) + Number(amt));
        }

        // Mizajou tranzaksyon an
        await update(ref(db, `transactions/${tid}`), {
            status: status,
            processedAt: serverTimestamp()
        });

        // VOYE NOTIFIKASYON (Kounye a push ap mache!)
        const notifRef = push(ref(db, `users/${uid}/notifications/transak`));
        await update(notifRef, {
            msg: `Tranzaksyon ${type} ou a ${status}! ${status === 'Validé' ? '✅' : '❌'}`,
            timestamp: Date.now()
        });

        alert("Siksè!");
    } catch (e) {
        console.error(e);
        alert("Erè: " + e.message);
    }
};

window.handleLogout = () => signOut(auth);

window.switchTab = (tab, el) => {
    document.querySelectorAll('.tab-content').forEach(t => t.classList.add('hidden'));
    document.getElementById('section-' + tab).classList.remove('hidden');
    document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
    if(el) el.classList.add('active');
};
