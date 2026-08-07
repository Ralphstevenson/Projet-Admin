// ============================================================
// ECHANJ PLUS - ADMIN ECHANJ LOGIC (admin-echanj.js)
// ============================================================

import { ref, onValue, update, runTransaction } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-database.js";

// Done lokal pou nou evite repete apèl initil nan network la
let localTransactions = {};
let localUsers = {};
let selectedClientId = null;

/**
 * Inisyalize seksyon Echanj la depi admin.js fin valide koneksyon an
 * @param {Database} db - Instans Firebase Realtime Database la
 */
export function initAdminEchanj(db) {
    console.log("Seksyon Echanj lan aktive an sekirite ak sistèm Sidebar!");

    const transRef = ref(db, 'transactions');
    const usersRef = ref(db, 'users');
    const listeEchanjDiv = document.getElementById('lis-echanj-container');
    const sidebarDiv = document.getElementById('div-clients-list');

    if (!listeEchanjDiv || !sidebarDiv) {
        console.error("Erè: Eleman yo pa egziste nan HTML la. Tcheke ID yo.");
        return;
    }

    // 1. Koute Node 'users' la an premye pou nou ka matche UID ak Non Kliyan yo
    onValue(usersRef, (userSnapshot) => {
        localUsers = userSnapshot.val() || {};
        
        // 2. Koute Node 'transactions' yo an tan reyèl
        onValue(transRef, (transSnapshot) => {
            localTransactions = transSnapshot.val() || {};
            
            // Rann ti wonn yo nan sidebar gòch la
            rannKliyanSidebar(db);
            
            // Si admin lan te deja chwazi yon kliyan, nou rafrechi tablo li a otomatikman
            if (selectedClientId) {
                rannTabloTranzaksyonKliyan(db, selectedClientId);
            }
        });
    });
}

/**
 * Filtre epi gwoupe tranzaksyon yo pou desine ti wonn kliyan yo bò gòch
 */
function rannKliyanSidebar(db) {
    const sidebarDiv = document.getElementById('div-clients-list');
    if (!sidebarDiv) return;

    const mapKliyanEchanj = {};

    // Gwoupe pa UID pou nou konnen ki kliyan ki fè echanj epi konte sa ki 'pending' yo
    for (let transId in localTransactions) {
        const t = localTransactions[transId];
        if (t.type === "echanj") {
            if (!mapKliyanEchanj[t.uid]) {
                mapKliyanEchanj[t.uid] = {
                    uid: t.uid,
                    pendingCount: 0
                };
            }
            if (t.status === "pending") {
                mapKliyanEchanj[t.uid].pendingCount += 1;
            }
        }
    }

    const lisKliyanMass = Object.values(mapKliyanEchanj);

    if (lisKliyanMass.length === 0) {
        sidebarDiv.innerHTML = "<p style='font-size:11px; text-align:center; color:#94a3b8; padding-top:20px;'>Vid</p>";
        return;
    }

    sidebarDiv.innerHTML = "";

    lisKliyanMass.forEach(ck => {
        // Chache non kliyan an nan done itilizatè yo
        const kontKliyan = localUsers[ck.uid];
        const nonKliyan = kontKliyan && kontKliyan.name ? kontKliyan.name : `Kliyan (${ck.uid.substring(0, 4)})`;
        
        const inisyal = nonKliyan.charAt(0);
        const klaseActive = selectedClientId === ck.uid ? "active" : "";
        const badjPending = ck.pendingCount > 0 ? `<span class="badge-pending">${ck.pendingCount}</span>` : "";

        // Kreye ti wonn konpak la ak tit lè sourit la pase sou li
        const itemHtml = `
            <div class="client-item ${klaseActive}" data-uid="${ck.uid}" title="${nonKliyan}">
                ${badjPending}
                <div class="client-avatar">${inisyal}</div>
            </div>
        `;
        sidebarDiv.innerHTML += itemHtml;
    });

    // Koute klik sou chak ti wonn kliyan
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
 * Desine Gwo Tablo a bò dwat pou Kliyan ki chwazi a
 */
function rannTabloTranzaksyonKliyan(db, uid) {
    const listeEchanjDiv = document.getElementById('lis-echanj-container');
    if (!listeEchanjDiv) return;

    const kontKliyan = localUsers[uid];
    const nonKliyan = kontKliyan && kontKliyan.name ? kontKliyan.name : `Kliyan (${uid.substring(0, 6)})`;
    const balansKliyan = kontKliyan && kontKliyan.balance !== undefined ? kontKliyan.balance : 0;

    // Filtre pou jwenn tranzaksyon kliyan sa a sèlman
    const tranzaksyonLiYo = [];
    for (let id in localTransactions) {
        const t = localTransactions[id];
        if (t.uid === uid && t.type === "echanj") {
            tranzaksyonLiYo.push({ id, ...t });
        }
    }

    // Tliye yo pou mete sa ki pi resan yo anlè nèt (soti nan pi gwo timestamp pou l desann)
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

    // Mete tout estrikti a nan bwat dwat la
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

    // Re-ajoute koutè klik yo sou nouvo bouton ki fèk desine nan tablo a
    ekouteBoutonAksyon(db);
}

/**
 * Lojik pou jere klik sou bouton Validé ak Anile yo anndan tablo a
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
                
                // Ogmante kont kliyan an otomatikman ak runTransaction pou evite konfli nan balans lan
                runTransaction(clientBalanceRef, (currentBalance) => {
                    return (currentBalance || 0) + montanPoulResevwa;
                })
                .then(() => {
                    // Depi kont lan kredite avèk siksè, nou chanje status tranzaksyon an an validé
                    return update(ref(db), updates);
                })
                .then(() => {
                    alert("Siksè! Tranzaksyon validé, kont kliyan an kredite.");
                })
                .catch((error) => {
                    console.error("Erè nan validation:", error);
                    alert("Gen yon erè ki pase pandan n ap kredite kont kliyan an. Tanpri reyezi.");
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
                    alert("Tranzaksyon anile avèk siksè! Pa gen okenn kòb ki transfere.");
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
            
