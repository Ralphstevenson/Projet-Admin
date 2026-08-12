import { db } from './script.js';
import { ref, get, onValue } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-database.js";

// ========================================================
// A. CHAJE LIS KLIYAN YO NAN SIDEBAR LA
// ========================================================
export function chajeLisKliyanSidebar() {
    const usersRef = ref(db, 'users');
    
    onValue(usersRef, (snapshot) => {
        const container = document.getElementById("admin-clients-sidebar-list");
        if (!container) return;
        container.innerHTML = "";

        if (snapshot.exists()) {
            const users = snapshot.val();
            
            Object.keys(users).forEach(uid => {
                const user = users[uid];
                const nonKonplè = user.name || "Kliyan San Non";
                const inisyal = nonKonplè.charAt(0).toUpperCase();

                // Kreye eleman pou chak kliyan nan sidebar a
                const div = document.createElement("div");
                div.className = "client-sidebar-item";
                div.onclick = () => ouvriDetayKliyan(uid, nonKonplè);
                
                div.innerHTML = `
                    <div class="client-avatar-mini">${inisyal}</div>
                    <div class="client-info">
                        <span style="font-weight:bold;">${nonKonplè}</span>
                    </div>
                `;
                container.appendChild(div);
            });
        } else {
            container.innerHTML = "<p>Pa gen okenn kliyan ki enskri.</p>";
        }
    });
}

// ========================================================
// B. OUVRÌ POP-UP LA AK ANALIZ SOU KLIYAN AN
// ========================================================
async function ouvriDetayKliyan(uid, nonKonplè) {
    document.getElementById("modal-client-name").innerText = nonKonplè;
    document.getElementById("modal-client-uid").innerText = uid;
    document.getElementById("modal-client-avatar").innerText = nonKonplè.charAt(0).toUpperCase();
    
    const tableBody = document.getElementById("modal-client-transactions-table");
    tableBody.innerHTML = "<tr><td colspan='5'>Ap chaje istorik...</td></tr>";

    let kontMonCash = 0;
    let kontNatcash = 0;
    let istovikHTML = "";

    // 1. Fouye nan nod 'transactions' (Echanj)
    const txSnapshot = await get(ref(db, 'transactions'));
    if (txSnapshot.exists()) {
        const txs = txSnapshot.val();
        Object.keys(txs).forEach(id => {
            if (txs[id].uid === uid) {
                const t = txs[id];
                const rezo = t.rezo ? t.rezo.toLowerCase() : "";
                if (rezo.includes("moncash") || rezo.includes("mon cash")) kontMonCash++;
                if (rezo.includes("natcash") || rezo.includes("nat cash")) kontNatcash++;

                istovikHTML += `
                    <tr>
                        <td>${id.substring(0,6)}...</td>
                        <td>Echanj</td>
                        <td>${t.amount_sent} HTG</td>
                        <td>${t.rezo || '---'}</td>
                        <td>${t.status}</td>
                    </tr>
                `;
            }
        });
    }

    // 2. Fouye nan nod 'withdrawals' (Retrè)
    const wdSnapshot = await get(ref(db, 'withdrawals'));
    if (wdSnapshot.exists()) {
        const wds = wdSnapshot.val();
        Object.keys(wds).forEach(id => {
            if (wds[id].uid === uid) {
                const w = wds[id];
                const rezo = w.rezo ? w.rezo.toLowerCase() : "";
                if (rezo.includes("moncash") || rezo.includes("mon cash")) kontMonCash++;
                if (rezo.includes("natcash") || rezo.includes("nat cash")) kontNatcash++;

                istovikHTML += `
                    <tr>
                        <td>${id.substring(0,6)}...</td>
                        <td>Retrè</td>
                        <td>${w.amount || '---'} HTG</td>
                        <td>${w.rezo || '---'}</td>
                        <td>${w.status}</td>
                    </tr>
                `;
            }
        });
    }

    // Afiche istovik la nan tablo a
    tableBody.innerHTML = istovikHTML || "<tr><td colspan='5'>Kliyan sa a potko fè okenn aktivite.</td></tr>";

    // 3. KALKIL REZO PI ITILIZE (Kalkil Entèlijan)
    const badgeElement = document.getElementById("modal-client-rezo-badge");
    badgeElement.className = "badge"; // Reyisyalize klas yo

    if (kontMonCash > kontNatcash) {
        badgeElement.innerText = `Mon Cash (Wouj - Sèvi ${kontMonCash} fwa)`;
        badgeElement.classList.add("badge-moncash");
    } else if (kontNatcash > kontMonCash) {
        badgeElement.innerText = `NATcash (Ble - Sèvi ${kontNatcash} fwa)`;
        badgeElement.classList.add("badge-natcash");
    } else if (kontMonCash === 0 && kontNatcash === 0) {
        badgeElement.innerText = "Okenn tranzaksyon potko fèt";
        badgeElement.classList.add("badge-egal");
    } else {
        badgeElement.innerText = "Egalite (Mon Cash & NATcash)";
        badgeElement.classList.add("badge-egal");
    }

    // Montre Modal la bay Admin lan
    document.getElementById("client-details-modal").style.display = "block";
}

// ========================================================
// C. FÈMEN POP-UP LA
// ========================================================
window.fèmenModalKliyan = function() {
    document.getElementById("client-details-modal").style.display = "none";
};

// Ekstènize fonksyon yo pou bouton HTML ka jwenn yo
window.ouvriDetayKliyan = ouvriDetayKliyan;

