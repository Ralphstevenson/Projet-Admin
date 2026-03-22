import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getAuth, signInWithEmailAndPassword, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { getDatabase, ref, onValue, update, serverTimestamp, runTransaction, push, get } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-database.js";

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

// Global Variables
let TO_AKTYEL = 150; 
const FRE_SISTEM = 16.5;
let currentChatUID = null;

// --- 2. LOGIN / LOGOUT ---
window.handleLogin = () => {
    const email = document.getElementById('admin-email').value;
    const pass = document.getElementById('admin-pass').value;
    if(!email || !pass) return alert("Ranpli tout bwat yo!");
    signInWithEmailAndPassword(auth, email, pass).catch(err => alert("Erè: " + err.message));
};

window.handleLogout = () => {
    update(ref(db, 'status/admin'), { state: "offline" });
    signOut(auth);
};

// --- 3. GADYEN AKSÈ ---
onAuthStateChanged(auth, (user) => {
    const overlay = document.getElementById('login-overlay');
    const panel = document.getElementById('main-admin-panel');
    
    if (user && user.uid === MASTER_UID) {
        overlay.classList.add('hidden');
        panel.classList.remove('hidden');
        update(ref(db, 'status/admin'), { state: "online", last_online: serverTimestamp() });
        lanseSistèmKontwòl();
    } else {
        if (user) signOut(auth);
        overlay.classList.remove('hidden');
        panel.classList.add('hidden');
    }
});

// --- 4. LOJIK SISTÈM ---
function lanseSistèmKontwòl() {
    // Koute To Echanj la an premye
    onValue(ref(db, 'settings/to_echanj'), (snap) => {
        if(snap.exists()) TO_AKTYEL = snap.val();

        // Koute tout done yo
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
                        <td>
                            <button class="btn-v" style="background:var(--primary)" onclick="ajisteBalans('${uid}', ${bal})"><i class="fa fa-edit"></i></button>
                            <button class="btn-v" style="background:var(--warning)" onclick="rekipereKod('${uid}')"><i class="fa fa-key"></i></button>
                        </td>
                    </tr>`;
                }
            });

            // B. TRANZAKSYON YO (AK KALKIL FRE 16.5)
            Object.keys(transactions).reverse().forEach(tid => {
                const t = transactions[tid];
                const tDate = new Date(t.timestamp).toDateString();
                const montan = parseFloat(t.amount || 0);

                if (t.status === "En attente") {
                    if (t.type === "Echanj") {
                        const netPouVoye = (montan - FRE_SISTEM) * TO_AKTYEL;
                        listEchanj.innerHTML += `
                        <tr>
                            <td>${t.arsID}<br><small>To: ${TO_AKTYEL}</small></td>
                            <td><small>Brut: ${montan} USD</small><br><small>Fre: -16.5</small></td>
                            <td><b style="color:var(--primary)">${netPouVoye.toFixed(2)} HTG</b></td>
                            <td>
                                <button class="btn-v" onclick="finalize('${tid}', '${t.uid}', ${t.amount}, '${t.type}', 'Validé')">V</button>
                                <button class="btn-x" onclick="finalize('${tid}', '${t.uid}', ${t.amount}, '${t.type}', 'Refusé')">X</button>
                            </td>
                        </tr>`;
                    } else {
                        listRetre.innerHTML += `
                        <tr>
                            <td>${t.arsID}</td>
                            <td><small>${t.receiver}<br>${t.phone} (${t.method})</small></td>
                            <td><b>${montan}</b></td>
                            <td>
                                <button class="btn-v" onclick="finalize('${tid}', '${t.uid}', ${t.amount}, '${t.type}', 'Validé')">V</button>
                                <button class="btn-x" onclick="finalize('${tid}', '${t.uid}', ${t.amount}, '${t.type}', 'Refusé')">X</button>
                            </td>
                        </tr>`;
                    }
                } else if (t.status === "Validé") {
                    pwofiTotal += (montan * 0.005);
                    if (tDate === jodiA && t.type === "Echanj") antreJodi += montan;
                    listHistory.innerHTML += `<tr><td>${new Date(t.timestamp).toLocaleDateString()}</td><td>${t.type}</td><td>${montan} HTG</td><td>${t.status}</td></tr>`;
                }
            });

            document.getElementById('total-balance').innerText = kèsTotal.toLocaleString() + " HTG";
            document.getElementById('today-in').innerText = antreJodi.toLocaleString() + " HTG";
            document.getElementById('total-profit').innerText = Math.floor(pwofiTotal).toLocaleString() + " HTG";
        });
    });
    kouteToutChat();
}

// --- 5. FINALIZE & TO ECHANJ ---
window.finalize = async (tid, uid, amt, type, status) => {
    if (!confirm(`Vle ${status} tranzaksyon sa a?`)) return;
    try {
        const userRef = ref(db, `users/${uid}/balance`);
        if (type === "Echanj" && status === "Validé") await runTransaction(userRef, (c) => (c || 0) + Number(amt));
        if ((type === "Retrè" || type === "Retrait") && status === "Refusé") await runTransaction(userRef, (c) => (c || 0) + Number(amt));
        
        await update(ref(db, `transactions/${tid}`), { status: status, processedAt: serverTimestamp() });
        push(ref(db, `users/${uid}/notifications/transak`), { msg: `Tranzaksyon ${type} ${status}!`, timestamp: Date.now() });
        alert("Siksè!");
    } catch (e) { alert("Erè: " + e.message); }
};

window.setExchangeRate = async () => {
    const nouvoTo = prompt("Nouvo To Echanj (1 USD = ? HTG):", TO_AKTYEL);
    if(nouvoTo) await update(ref(db, 'settings'), { to_echanj: Number(nouvoTo) });
};

// --- 6. REKIPERE KÒD PIN ---
window.rekipereKod = async (uid) => {
    try {
        const snap = await get(ref(db, `users/${uid}/pin`));
        if (snap.exists()) {
            alert(`Kòd Sekirite kliyan sa a se: ${snap.val()}\n\nBay kliyan an li pou l ka debloke kont li.`);
        } else {
            alert("Kliyan sa a poko kreye yon kòd.");
        }
    } catch (e) { alert("Erè: " + e.message); }
};

window.ajisteBalans = async (uid, balAktiyèl) => {
    const nouvoBal = prompt("Chanje Balans (HTG):", balAktiyèl);
    if (nouvoBal !== null) {
        const nouvoStatus = confirm("Bloke Kliyan sa a?") ? "blocked" : "active";
        await update(ref(db, `users/${uid}`), { balance: Number(nouvoBal), status: nouvoStatus });
    }
};

// --- 7. SISTÈM CHAT ---
function kouteToutChat() {
    onValue(ref(db, 'chats'), (snap) => {
        const chatList = document.getElementById('chat-list');
        if (!chatList) return;
        chatList.innerHTML = "";
        const chats = snap.val();
        if (chats) {
            Object.keys(chats).forEach(uid => {
                const msgs = chats[uid].messages;
                const last = msgs[Object.keys(msgs).pop()];
                const card = document.createElement('div');
                card.className = 'chat-card';
                card.onclick = () => window.louvriChat(uid);
                card.innerHTML = `<strong>Kliyan: ${uid.substring(0,6)}</strong><p>${last.text}</p>`;
                chatList.appendChild(card);
            });
        }
    });
}

window.louvriChat = (uid) => {
    currentChatUID = uid;
    document.getElementById('chat-list').classList.add('hidden');
    document.getElementById('active-chat-window').classList.remove('hidden');
    onValue(ref(db, `chats/${uid}/messages`), (snap) => {
        const msgBox = document.getElementById('chat-messages');
        msgBox.innerHTML = "";
        if (snap.exists()) {
            Object.values(snap.val()).forEach(m => {
                const d = document.createElement('div');
                d.className = m.sender === 'client' ? 'msg-client' : 'msg-admin';
                d.innerText = m.text;
                msgBox.appendChild(d);
            });
            msgBox.scrollTop = msgBox.scrollHeight;
        }
    });
};

window.sendAdminReply = async () => {
    const input = document.getElementById('admin-reply-input');
    if (input.value.trim() && currentChatUID) {
        await push(ref(db, `chats/${currentChatUID}/messages`), {
            sender: "admin", text: input.value, timestamp: serverTimestamp()
        });
        input.value = "";
    }
};
                                       
