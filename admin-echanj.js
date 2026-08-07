// ============================================================
// ECHANJ PLUS - ADMIN ECHANJ LOGIC (admin-echanj.js)
// ============================================================

import { ref, onValue, update, runTransaction } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-database.js";

// Done lokal pou nou evite repete apèl initil nan network la
let localTransactions = {};
let localUsers = {};
let selectedClientId = null;

// Lyen imaj ekran akèy la lè okenn kliyan poko seleksyone
const IMAJ_AKEY_URL = "https://i.postimg.cc/qRS0rchG/1786118534528.png";

/**
 * Inisyalize seksyon Echanj la depi admin.js fin valide koneksyon an
 * @param {Database} db - Instans Firebase Realtime Database la
 */
export function initAdminEchanj(db) {
    console.log("Mizajou: Seksyon Echanj aktive. Tout tranzaksyon yo ap rale pa UID san manke anyen!");

    const transRef = ref(db, 'transactions');
    const usersRef = ref(db, 'users');
    const listeEchanjDiv = document.getElementById('lis-echanj-container');
    const sidebarDiv = document.getElementById('div-clients-list');

    if (!listeEchanjDiv || !sidebarDiv) {
        console.error("Erè: Eleman yo pa egziste nan HTML la. Tcheke ID yo.");
        return;
    }

    // Afiche ekran akèy la pa defo depi sistèm nan ap chaje
    rannEkranAkeyImaj(listeEchanjDiv);

    // 1. Koute Node 'users' la an premye
    onValue(usersRef, (userSnapshot) => {
        localUsers = userSnapshot.val() || {};
        
        // 2. Koute Node 'transactions' yo an tan reyèl pou rale TOUT done nèt
        onValue(transRef, (transSnapshot) => {
            localTransactions = transSnapshot.val() || {};
            
            // Rann sidebar a kote baz la se itilizatè yo nèt pou anyen pa bliye
            rannKliyanSidebar(db);
            
            // Si admin lan te deja chwazi yon kliyan, nou rafrechi tablo li a otomatikman san pèdi alèt yo
            if (selectedClientId) {
                rannTabloTranzaksyonKliyan(db, selectedClientId);
            }
        });
    });
}

/**
 * Afiche Imaj la lè okenn kliyan poko seleksyone
 */
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
 * Filtre epi gwoupe tout tranzaksyon yo pa UID kliyan depi se yon echanj
 */
function rannKliyanSidebar(db) {
    const sidebarDiv = document.getElementById('div-clients-list');
    if (!sidebarDiv) return;

    const mapKliyanEchanj = {};

    // Gid Siprèm: Nou skane TOUT tranzaksyon yo nèt san eksepsyon
    for (let transId in localTransactions) {
        const t = localTransactions[transId];
        
        // Asire nou ke tranzaksyon an gen rapò ak echanj nèt epi li gen yon UID ki valid
        if (t && t.type === "echanj" && t.uid) {
            if (!mapKliyanEchanj[t.uid]) {
                mapKliyanEchanj[t.uid] = {
                    uid: t.uid,
                    pendingCount: 0
                };
            }
            // Si estati a se pending, n ap ogmante badj la pou admin nan ka wè kantite egzak la
            if (t.status === "pending") {
                mapKliyanEchanj[t.uid].pendingCount += 1;
            }
        }
    }

    const lisKliyanMass = Object.values(mapKliyanEchanj);

    if (lisKliyanMass.length === 0) {
        sidebarDiv.innerHTML = "<p style='font-size:11px; text-align:center; color:#94a3b8; padding-top:20px;'>Pa gen echanj</p>";
        return;
    }

    sidebarDiv.innerHTML = "";

    lisKliyanMass.forEach(ck => {
        const kontKliyan = localUsers[ck.uid];
        const nonKliyan = kontKliyan && kontKliyan.name ? kontKliyan.name : `Kliyan (${ck.uid.substring(0, 5)})`;
        
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

    // Koute klik yo pou louvri kliyan an pa UID
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
 * Desine Gwo Tablo a bò dwat ak TOUT istwa tranzaksyon kliyan sa a nèt
 */
function rannTabloTranzaksyonKliyan(db, uid) {
    const listeEchanjDiv = document.getElementById('lis-echanj-container');
    if (!listeEchanjDiv) return;

    const kontKliyan = localUsers[uid];
    const nonKliyan = kontKliyan && kontKliyan.name ? kontKliyan.name : `Kliyan (${uid.substring(0, 6)})`;
    const balansKliyan = kontKliyan && kontKliyan.balance !== undefined ? kontKliyan.balance : 0;

    // Rale tout tranzaksyon kliyan an nèt pa UID li
    const tranzaksyonLiYo = [];
    for (let id in localTransactions) {
        const t = localTransactions[id];
        if (t && t.uid === uid && t.type === "echanj") {
            tranzaksyonLiYo.push({ id, ...t });
        }
    }

    // Tliye yo pou mete pi resan yo anlè nèt (Lòd kwonolojik desandan)
    tranzaksyonLiYo.sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));

    let tBodyRows = "";
    tranzaksyonLiYo.forEach(t => {
        let aksyonTd = "";
        
        if (t.status === "pending") {
            aksyonTd = `
                <div class="table-actions">
                    <button class="btn-table-valide btn-valide" data-id="${t.id}" data-uid="${t.uid}" data-receive="${t.to_receive}">Validé</button>
                    <button class="btn-table-anile btn-anile" data-id="${t.id}">Anile</button>
                </div>
            `;
        } else {
            aksyonTd = `<span class="table-status-text badge-status-${t.status}">${t.status.toUpperCase()}</span>`;
        }

        const datTranzaksyon = t.timestamp ? new Date(t.timestamp).toLocaleString('fr-FR') : 'N/A';

        tBodyRows += `
            <tr>
                <td style="font-family: monospace; font-size:12px; color:#2563eb; font-weight:bold;">${t.id}</td>
                <td style="font-size:12px; color:#64748b;">${datTranzaksyon}</td>
                <td><span class="badge-rezo">${t.rezo ? t.rezo.toUpperCase() : 'N/A'}</span></td>
                <td><strong style="color:#1e293b;">${t.amount}</strong> HTG</td>
                <td style="color:#16a34a; font-weight:bold;">+ ${t.to_receive} HTG</td>
                <td><span class="table-status-text badge-status-${t.status}">${t.status}</span></td>
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
                        <th>Rezo</th>
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

/**
 * Lojik sekirite pou manm komite a pa fè doub klik oswa klik fwod
 */
function ekouteBoutonAksyon(db) {
    // Bouton Validé
    document.querySelectorAll('.btn-valide').forEach(btn => {
        btn.addEventListener('click', function() {
            const transId = this.getAttribute('data-id');
            const clientUid = this.getAttribute('data-uid');
            const montanPoulResevwa = parseFloat(this.getAttribute('data-receive'));

            if (isNaN(montanPoulResevwa) || montanPoulResevwa <= 0) {
                alert("Erè: Montan pou kliyan an resevwa a pa valid.");
                return;
            }

            if (confirm(`Èske ou vle valide echanj ${transId} lan? \n\nKont kliyan an ap kredite de: ${montanPoulResevwa} HTG.`)) {
                this.disabled = true;
                const adminBtnGroup = this.parentElement;
                if (adminBtnGroup) adminBtnGroup.style.opacity = "0.5";
                
                const updates = {};
                updates[`/transactions/${transId}/status`] = "validé";

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
                    if (adminBtnGroup) adminBtnGroup.style.opacity = "1";
                });
            }
        });
    });

    // Bouton Anile
    document.querySelectorAll('.btn-anile').forEach(btn => {
        btn.addEventListener('click', function() {
            const transId = this.getAttribute('data-id');

            if (confirm(`Èske ou sèten ou vle anile tranzaksyon ${transId} lan?`)) {
                this.disabled = true;
                const adminBtnGroup = this.parentElement;
                if (adminBtnGroup) adminBtnGroup.style.opacity = "0.5";
                
                const updates = {};
                updates[`/transactions/${transId}/status`] = "anile";

                update(ref(db), updates)
                .then(() => {
                    alert("Tranzaksyon anile avèk siksè!");
                })
                .catch((error) => {
                    console.error("Erè nan anilasyon:", error);
                    alert("Erè pandan n ap anile tranzaksyon an.");
                    this.disabled = false;
                    if (adminBtnGroup) adminBtnGroup.style.opacity = "1";
                });
            }
        });
    });
                }
                    
