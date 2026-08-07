// ============================================================
// ECHANJ PLUS - ADMIN ECHANJ LOGIC (admin-echanj.js)
// ============================================================

import { ref, onValue, update, runTransaction } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-database.js";

// Done lokal pou evite repete apèl initil
let localTransactions = {};
let localUsers = {};
let selectedClientId = null;

const IMAJ_AKEY_URL = "https://i.postimg.cc/qRS0rchG/1786118534528.png";

export function initAdminEchanj(db) {
    console.log("Seksyon Echanj aktive: Lojik Hybrid ak sipò pou tout nouvo kle Firebase yo!");

    const transRef = ref(db, 'transactions');
    const usersRef = ref(db, 'users');
    const listeEchanjDiv = document.getElementById('lis-echanj-container');
    const sidebarDiv = document.getElementById('div-clients-list');

    if (!listeEchanjDiv || !sidebarDiv) {
        console.error("Erè: Eleman yo pa egziste nan HTML la.");
        return;
    }

    rannEkranAkeyImaj(listeEchanjDiv);

    // 1. Koute Node 'users' la
    onValue(usersRef, (userSnapshot) => {
        localUsers = userSnapshot.val() || {};
        
        // 2. Koute Node 'transactions' la
        onValue(transRef, (transSnapshot) => {
            localTransactions = transSnapshot.val() || {};
            
            // Rann lis kliyan yo nan sidebar a gòch la
            rannKliyanSidebar(db);
            
            // Si admin lan te deja chwazi yon kliyan, nou rafrechi tablo li a otomatikman
            if (selectedClientId) {
                rannTabloTranzaksyonKliyan(db, selectedClientId);
            }
        });
    });
}

function rannEkranAkeyImaj(bwatDwatDiv) {
    bwatDwatDiv.innerHTML = `
        <div class="no-client-selected" style="display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 40px; text-align: center; height: 100%;">
            <img src="${IMAJ_AKEY_URL}" alt="Echanj Plus" style="max-width: 180px; margin-bottom: 20px; filter: drop-shadow(0px 4px 6px rgba(0,0,0,0.1));" />
            <h3 style="color: #1e293b; margin: 0 0 8px 0; font-size: 16px;">Sistèm Jesyon Echanj</h3>
            <p style="color: #64748b; font-size: 13px; max-width: 300px; margin: 0;">Chwazi yon kliyan nan sidebar a gòch la pou wè, valide oswa anile demann li yo.</p>
        </div>
    `;
}

/**
 * Pwosesis fleksib pou rasanble tout echanj yo nèt (Ansyen ak Nouvo fòma kle yo)
 */
function raleToutEchanjPaKliyan() {
    const mapKliyanEchanj = {};

    for (let kle in localTransactions) {
        const obj = localTransactions[kle];
        if (!obj) continue;

        // FÒMA 1: Tranzaksyon an plase dirèkteman anba `transactions/ID_TRANSACTION`
        if (obj.uid && obj.type) {
            const tipLower = obj.type.toLowerCase();
            
            // Tcheke si se yon tip echanj oswa retrè
            if (tipLower.includes("echanj") || tipLower.includes("retré") || tipLower.includes("retre")) {
                const uid = obj.uid;
                if (!mapKliyanEchanj[uid]) {
                    mapKliyanEchanj[uid] = { uid: uid, pendingCount: 0, lislèt: [] };
                }
                
                // MIZAJOU KLE: Rale montan ak valè nèt la dapre tout fòma posib yo
                const amountToSend = parseFloat(obj.amount_sent || obj.amount || obj.montan || obj.kantite || 0);
                const amountToReceive = parseFloat(obj.htg_to_receive || obj.received || obj.to_receive || obj.resevwa || 0);
                const currentStatus = obj.status || "pending";
                const statusLower = currentStatus.toLowerCase();

                mapKliyanEchanj[uid].lislèt.push({
                    id: kle,
                    amount: amountToSend,
                    to_receive: amountToReceive,
                    rezo: obj.method || obj.rezo || "N/A",
                    status: currentStatus,
                    timestamp: obj.timestamp || obj.date || 0
                });

                // Detekte si tranzaksyon sa a an atant nèt (nou enkli "en attente" kounye a)
                if (statusLower === "pending" || statusLower === "an atant" || statusLower === "en attente") {
                    mapKliyanEchanj[uid].pendingCount += 1;
                }
            }
        } 
        // FÒMA 2: Tranzaksyon an kache anndan yon node UID (Fòma nested: transactions/UID/ID_TRANSACTION)
        else if (typeof obj === "object" && !obj.uid) {
            const itilizatèUid = kle; 
            
            for (let subKle in obj) {
                const subObj = obj[subKle];
                if (subObj && subObj.type) {
                    const subTipLower = subObj.type.toLowerCase();
                    if (subTipLower.includes("echanj") || subTipLower.includes("retré") || subTipLower.includes("retre")) {
                        if (!mapKliyanEchanj[itilizatèUid]) {
                            mapKliyanEchanj[itilizatèUid] = { uid: itilizatèUid, pendingCount: 0, lislèt: [] };
                        }

                        // Menm analiz la pou fòma kache a tou
                        const nestedAmountToSend = parseFloat(subObj.amount_sent || subObj.kantite || subObj.amount || subObj.montan || 0);
                        const nestedAmountToReceive = parseFloat(subObj.htg_to_receive || subObj.resevwa || subObj.received || subObj.to_receive || 0);
                        const subStatus = subObj.status || "pending";
                        const subStatusLower = subStatus.toLowerCase();

                        mapKliyanEchanj[itilizatèUid].lislèt.push({
                            id: subKle,
                            amount: nestedAmountToSend,
                            to_receive: nestedAmountToReceive,
                            rezo: subObj.method || subObj.rezo || subObj.tip || "N/A",
                            status: subStatus,
                            timestamp: subObj.date || subObj.timestamp || 0,
                            isNested: true,
                            parentUid: itilizatèUid
                        });

                        if (subStatusLower === "pending" || subStatusLower === "an atant" || subStatusLower === "en attente") {
                            mapKliyanEchanj[itilizatèUid].pendingCount += 1;
                        }
                    }
                }
            }
        }
    }
    return mapKliyanEchanj;
}

/**
 * Rann ti wonn yo nan sidebar gòch la
 */
function rannKliyanSidebar(db) {
    const sidebarDiv = document.getElementById('div-clients-list');
    if (!sidebarDiv) return;

    const mapKliyan = raleToutEchanjPaKliyan();
    const lisKliyanMass = Object.values(mapKliyan);

    if (lisKliyanMass.length === 0) {
        sidebarDiv.innerHTML = "<p style='font-size:11px; text-align:center; color:#94a3b8; padding-top:20px;'>Vid</p>";
        return;
    }

    sidebarDiv.innerHTML = "";

    lisKliyanMass.forEach(ck => {
        const kontKliyan = localUsers[ck.uid];
        const nonKliyan = kontKliyan && kontKliyan.name ? kontKliyan.name : (kontKliyan && kontKliyan.fullname ? kontKliyan.fullname : `Kliyan (${ck.uid.substring(0, 4)})`);
        
        const inisyal = nonKliyan.charAt(0);
        const klaseActive = selectedClientId === ck.uid ? "active" : "";
        const badjPending = ck.pendingCount > 0 ? `<span class="badge-pending">${ck.pendingCount}</span>` : "";

        const itemHtml = `
            <div class="client-item ${klaseActive}" data-uid="${ck.uid}" title="${nonKliyan}">
                ${badjPending}
                <div class="client-avatar">${inisyal}</div>
            </div>
        `;
        sidebarDiv.innerHTML += itemHtml;
    });

    document.querySelectorAll('.client-item').forEach(item => {
        item.addEventListener('click', function() {
            const uid = this.getAttribute('data-uid');
            selectedClientId = uid;
            
            document.querySelectorAll('.client-item').forEach(i => i.classList.remove('active'));
            this.classList.add('active');

            rannTabloTranzaksyonKliyan(db, uid);
        });
    });
}

/**
 * Desine gwo tablo a bò dwat pou kliyan an
 */
function rannTabloTranzaksyonKliyan(db, uid) {
    const listeEchanjDiv = document.getElementById('lis-echanj-container');
    if (!listeEchanjDiv) return;

    const kontKliyan = localUsers[uid];
    const nonKliyan = kontKliyan && kontKliyan.name ? kontKliyan.name : (kontKliyan && kontKliyan.fullname ? kontKliyan.fullname : `Kliyan (${uid.substring(0, 6)})`);
    const balansKliyan = kontKliyan && kontKliyan.balance !== undefined ? kontKliyan.balance : 0;

    const mapKliyan = raleToutEchanjPaKliyan();
    const doneKliyan = mapKliyan[uid] || { lislèt: [] };
    const tranzaksyonLiYo = doneKliyan.lislèt;

    // Tliye nan lòd pi resan yo anlè nèt
    tranzaksyonLiYo.sort((a, b) => {
        const dateA = typeof a.timestamp === 'number' ? a.timestamp : new Date(a.timestamp).getTime() || 0;
        const dateB = typeof b.timestamp === 'number' ? b.timestamp : new Date(b.timestamp).getTime() || 0;
        return dateB - dateA;
    });

    let tBodyRows = "";
    tranzaksyonLiYo.forEach(t => {
        let aksyonTd = "";
        const statusLower = (t.status || "").toLowerCase();
        const isPending = statusLower === "pending" || statusLower === "an atant" || statusLower === "en attente";
        
        if (isPending) {
            aksyonTd = `
                <div class="table-actions">
                    <button class="btn-table-valide btn-valide" 
                        data-id="${t.id}" 
                        data-uid="${uid}" 
                        data-receive="${t.to_receive}" 
                        data-nested="${t.isNested || false}">Validé</button>
                    <button class="btn-table-anile btn-anile" 
                        data-id="${t.id}" 
                        data-uid="${uid}"
                        data-nested="${t.isNested || false}">Anile</button>
                </div>
            `;
        } else {
            const klaseStati = (statusLower === "validé" || statusLower === "siksè" || statusLower === "valide") ? "validé" : "anile";
            aksyonTd = `<span class="table-status-text badge-status-${klaseStati}">${t.status.toUpperCase()}</span>`;
        }

        let datTranzaksyon = 'N/A';
        if (t.timestamp) {
            if (typeof t.timestamp === 'number') {
                datTranzaksyon = new Date(t.timestamp).toLocaleString('fr-FR');
            } else {
                datTranzaksyon = t.timestamp;
            }
        }

        tBodyRows += `
            <tr>
                <td style="font-family: monospace; font-size:11px; color:#2563eb; font-weight:bold;">${t.id}</td>
                <td style="font-size:12px; color:#64748b;">${datTranzaksyon}</td>
                <td><span class="badge-rezo">${t.rezo.toUpperCase()}</span></td>
                <td><strong style="color:#1e293b;">${t.amount}</strong> HTG</td>
                <td style="color:#16a34a; font-weight:bold;">+ ${t.to_receive} HTG</td>
                <td><span class="table-status-text badge-status-${isPending ? 'pending' : ((statusLower === 'validé' || statusLower === 'siksè' || statusLower === 'valide') ? 'validé' : 'anile')}">${t.status}</span></td>
                <td>${aksyonTd}</td>
            </tr>
        `;
    });

    listeEchanjDiv.innerHTML = `
        <div class="viewport-header" style="padding-bottom: 15px; margin-bottom: 20px; border-bottom: 1px solid #e2e8f0;">
            <div class="viewport-header-info">
                <h3 style="margin:0; font-size:18px; color:#0f172a;">${nonKliyan}</h3>
                <p style="margin:5px 0 0 0; font-size:12px; color:#64748b;">UID: ${uid} | <strong>Balans: <span style="color:#10b981;">${balansKliyan} HTG</span></strong></p>
            </div>
        </div>
        <div class="table-responsive">
            <table class="admin-table" style="width:100%; border-collapse:collapse; text-align:left;">
                <thead>
                    <tr>
                        <th>ID Tranzaksyon</th>
                        <th>Dat / Lè</th>
                        <th>Rezo / Metòd</th>
                        <th>Montan Voye</th>
                        <th>Net pou Resevwa</th>
                        <th>Stati</th>
                        <th>Aksyon / Eta</th>
                    </tr>
                </thead>
                <tbody>
                    ${tBodyRows || `<tr><td colspan="7" style="text-align:center; color:#94a3b8; padding:20px;">Kliyan sa a pa gen okenn echanj.</td></tr>`}
                </tbody>
            </table>
        </div>
    `;

    ekouteBoutonAksyon(db);
}

function ekouteBoutonAksyon(db) {
    // Bouton Validé
    document.querySelectorAll('.btn-valide').forEach(btn => {
        btn.addEventListener('click', function() {
            const transId = this.getAttribute('data-id');
            const clientUid = this.getAttribute('data-uid');
            const isNested = this.getAttribute('data-nested') === "true";
            const montanPoulResevwa = parseFloat(this.getAttribute('data-receive'));

            if (isNaN(montanPoulResevwa) || montanPoulResevwa <= 0) {
                alert("Erè: Montan pou kliyan an resevwa a pa valid nan sistèm lan.");
                return;
            }

            if (confirm(`Èske ou vle valide echanj ${transId} lan? \n\nKont kliyan an ap kredite de: ${montanPoulResevwa} HTG.`)) {
                this.disabled = true;
                
                const pathStatus = isNested 
                    ? `/transactions/${clientUid}/${transId}/status` 
                    : `/transactions/${transId}/status`;

                const updates = {};
                updates[pathStatus] = "Validé"; 

                const clientBalanceRef = ref(db, `users/${clientUid}/balance`);
                
                runTransaction(clientBalanceRef, (currentBalance) => {
                    return (currentBalance || 0) + montanPoulResevwa;
                })
                .then(() => {
                    return update(ref(db), updates);
                })
                .then(() => {
                    alert("Siksè! Tranzaksyon validé, kont kliyan an kredite.");
                })
                .catch((error) => {
                    console.error("Erè nan validation:", error);
                    alert("Gen yon erè ki pase. Tanpri reyezi.");
                    this.disabled = false;
                });
            }
        });
    });

    // Bouton Anile
    document.querySelectorAll('.btn-anile').forEach(btn => {
        btn.addEventListener('click', function() {
            const transId = this.getAttribute('data-id');
            const clientUid = this.getAttribute('data-uid');
            const isNested = this.getAttribute('data-nested') === "true";

            if (confirm(`Èske ou sèten ou vle anile tranzaksyon ${transId} lan?`)) {
                this.disabled = true;
                
                const pathStatus = isNested 
                    ? `/transactions/${clientUid}/${transId}/status` 
                    : `/transactions/${transId}/status`;

                const updates = {};
                updates[pathStatus] = "Anile";

                update(ref(db), updates)
                .then(() => {
                    alert("Tranzaksyon anile avèk siksè!");
                })
                .catch((error) => {
                    console.error("Erè nan anilasyon:", error);
                    alert("Erè pandan n ap anile tranzaksyon an.");
                    this.disabled = false;
                });
            }
        });
    });
}
