import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getAuth, signInWithEmailAndPassword, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { getDatabase, ref, onValue, update, serverTimestamp, runTransaction, push } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-database.js";

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
    if(!email || !pass) return alert("Ranpli tout bwat yo!");
    signInWithEmailAndPassword(auth, email, pass).catch(err => alert("Erè: " + err.message));
};

window.handleLogout = () => signOut(auth);

// --- 3. GADYEN AKSÈ ---
onAuthStateChanged(auth, (user) => {
    const overlay = document.getElementById('login-overlay');
    const panel = document.getElementById('main-admin-panel');
    
    if (user && user.uid === MASTER_UID) {
        overlay.classList.add('hidden');
        panel.classList.remove('hidden');
        lanseSistèmKontwòl();
    } else {
        if (user) signOut(auth);
        overlay.classList.remove('hidden');
        panel.classList.add('hidden');
    }
});

// --- 4. LOJIK STATISTIK & TRANZAKSYON ---
function lanseSistèmKontwòl() {
    onValue(ref(db, '/'), (snapshot) => {
        const data = snapshot.val() || {};
        const users = data.users || {};
        const transactions = data.transactions || {};
        const jodiA = new Date().toDateString();

        let kèsTotal = 0, pwofiTotal = 0, antreJodi = 0;

        const listEchanj = document.getElementById('list-pending-echanj');
        const listRetre = document.getElementById('list-pending-retre');
        const listHistory = document.getElementById('list-history');
        const listUsers = document.getElementById('list-users');
        
        if(listEchanj) listEchanj.innerHTML = "";
        if(listRetre) listRetre.innerHTML = "";
        if(listHistory) listHistory.innerHTML = "";
        if(listUsers) listUsers.innerHTML = "";

        // A. KLIYAN YO
        Object.keys(users).forEach(uid => {
            const u = users[uid];
            const bal = Number(u.balance || 0);
            kèsTotal += bal;
            
            if(listUsers) {
                listUsers.innerHTML += `
                <tr>
                    <td>${u.arsID || '---'}<br><small>${u.fullname || ''}</small></td>
                    <td><b>${bal.toFixed(2)}</b></td>
                    <td><span class="badge ${u.status || 'active'}">${u.status || 'active'}</span></td>
                    <td><button class="btn-v" style="background:#0052cc" onclick="ajisteBalans('${uid}', ${bal}, '${u.status}')"><i class="fa fa-edit"></i></button></td>
                </tr>`;
            }
        });

        // B. TRANZAKSYON YO
        Object.keys(transactions).reverse().forEach(tid => {
            const t = transactions[tid];
            const tDate = new Date(t.timestamp).toDateString();
            const montan = parseFloat(t.amount || 0);

            if (t.status === "En attente") {
                if (t.type === "Echanj") {
                    if(listEchanj) listEchanj.innerHTML += kreyeLiyTablo(t, tid, "echanj");
                } else {
                    if(listRetre) listRetre.innerHTML += kreyeLiyTablo(t, tid, "retre");
                }
            } else if (t.status === "Validé") {
                pwofiTotal += (montan * 0.005);
                if (tDate === jodiA) {
                    if (t.type === "Echanj") antreJodi += montan;
                }
                if(listHistory) {
                    listHistory.innerHTML += `<tr><td>${new Date(t.timestamp).toLocaleDateString()}</td><td>${t.type}</td><td>${montan} HTG</td><td>${t.status}</td></tr>`;
                }
            }
        });

        // C. UPDATE UI
        document.getElementById('total-balance').innerText = kèsTotal.toLocaleString() + " HTG";
        document.getElementById('today-in').innerText = antreJodi.toLocaleString() + " HTG";
        document.getElementById('total-profit').innerText = Math.floor(pwofiTotal).toLocaleString() + " HTG";
    });
}

function kreyeLiyTablo(t, tid, kategori) {
    let detay = (kategori === "retre") 
        ? `<small>${t.receiver || '---'}<br>${t.phone || ''} (${t.method || ''})</small>` 
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

// --- 5. FINALIZE (VALIDASYON) ---
window.finalize = async (tid, uid, amt, type, status) => {
    if (!confirm(`Vle ${status} tranzaksyon sa a?`)) return;
    try {
        const userRef = ref(db, `users/${uid}/balance`);
        if (type === "Echanj" && status === "Validé") {
            await runTransaction(userRef, (curr) => (curr || 0) + Number(amt));
        }
        if ((type === "Retrè" || type === "Retrait") && status === "Refusé") {
            await runTransaction(userRef, (curr) => (curr || 0) + Number(amt));
        }
        await update(ref(db, `transactions/${tid}`), { status: status, processedAt: serverTimestamp() });
        
        // Notifikasyon
        const notifRef = push(ref(db, `users/${uid}/notifications/transak`));
        await update(notifRef, { msg: `Tranzaksyon ${type} ${status}!`, timestamp: Date.now() });
        alert("Siksè!");
    } catch (e) { alert("Erè: " + e.message); }
};

// --- 6. AJISTE BALANS / BLOKE MOUN ---
window.ajisteBalans = async (uid, balAktiyèl, status) => {
    const nouvoBal = prompt(`Balans kounye a: ${balAktiyèl} HTG\nAntre nouvo balans lan:`, balAktiyèl);
    if (nouvoBal === null) return;
    
    const nouvoStatus = confirm("Vle BLOKE kliyan sa a?") ? "blocked" : "active";

    try {
        await update(ref(db, `users/${uid}`), {
            balance: Number(nouvoBal),
            status: nouvoStatus
        });
        alert("Done yo ajou!");
    } catch (e) { alert("Erè: " + e.message); }
};
            
