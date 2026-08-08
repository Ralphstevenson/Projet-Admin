// ============================================================
// ECHANJ PLUS - ADMIN RETRE LOGIC (admin-retre.js)
// ============================================================

import { ref, onValue, update, runTransaction } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-database.js";

let localTransactions = {};
let localUsers = {};
let selectedClientId = null;

const IMAJ_AKEY_RETRE_URL = "https://i.postimg.cc/qRS0rchG/1786118534528.png";

export function initAdminRetre(db) {
    console.log("Seksyon Retrè aktive: Sèlman tranzaksyon retrè yo k ap trete.");

    const transRef = ref(db, 'transactions');
    const usersRef = ref(db, 'users');
    const listeRetreDiv = document.getElementById('lis-retre-container');
    const sidebarDiv = document.getElementById('div-clients-retre-list');

    if (!listeRetreDiv || !sidebarDiv) {
        console.error("Erè: Eleman HTML pou retrè yo pa egziste nan paj la.");
        return;
    }

    rannEkranAkeyRetreImaj(listeRetreDiv);

    // 1. Koute Node 'users' la
    onValue(usersRef, (userSnapshot) => {
        localUsers = userSnapshot.val() || {};
        
        // 2. Koute Node 'transactions' la
        onValue(transRef, (transSnapshot) => {
            localTransactions = transSnapshot.val() || {};
            
            // Rann lis kliyan ki gen tranzaksyon RETRÈ sèlman
            rannKliyanRetreSidebar(db);
            
            // Si admin lan te chwazi yon kliyan deja, nou rafrechi tablo retrè li a
            if (selectedClientId) {
                rannTabloRetreKliyan(db, selectedClientId);
            }
        });
    });
}

function rannEkranAkeyRetreImaj(bwatDwatDiv) {
    bwatDwatDiv.innerHTML = `
        <div class="no-client-selected" style="display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 40px; text-align: center; height: 100%;">
            <img src="${IMAJ_AKEY_RETRE_URL}" alt="Echanj Plus Retrè" style="max-width: 180px; margin-bottom: 20px; filter: drop-shadow(0px 4px 6px rgba(0,0,0,0.1));" />
            <h3 style="color: #1e293b; margin: 0 0 8px 0; font-size: 16px;">Sistèm Jesyon Retrè</h3>
            <p style="color: #64748b; font-size: 13px; max-width: 300px; margin: 0;">Chwazi yon kliyan nan sidebar a gòch la pou wè, valide oswa anile demann retrè li yo.</p>
        </div>
    `;
}

/**
 * Pwosesis filtraj strik: Nou pran SÈLMAN tranzaksyon ki gen rapò ak retrè
 */
function raleToutRetrePaKliyan() {
    const mapKliyanRetre = {};

    for (let kle in localTransactions) {
        const obj = localTransactions[kle];
        if (!obj) continue;

        // FÒMA 1: Tranzaksyon dirèk (transactions/ID_TRANSACTION)
        if (obj.uid && obj.type) {
            const tipLower = obj.type.toLowerCase();
            
            // FÈT YON FILTRAJ STRIK POU RETRÈ SÈLMAN
            if (tipLower.includes("retré") || tipLower.includes("retre") || tipLower === "withdrawal") {
                const uid = obj.uid;
                if (!mapKliyanRetre[uid]) {
                    mapKliyanRetre[uid] = { uid: uid, pendingCount: 0, lislèt: [] };
                }
                
                const amountSent = parseFloat(obj.amount_sent || obj.amount || obj.montan || obj.kantite || 0);
                const currentStatus = obj.status || "pending";
                const statusLower = currentStatus.toLowerCase();

                mapKliyanRetre[uid].lislèt.push({
                    id: kle,
                    amount: amountSent,
                    rezo: obj.method || obj.rezo || "N/A",
                    status: currentStatus,
                    timestamp: obj.timestamp || obj.date || 0,
                    isNested: false
                });

                if (statusLower === "pending" || statusLower === "an atant" || statusLower === "en attente") {
                    mapKliyanRetre[uid].pendingCount += 1;
                }
            }
        } 
        // FÒMA 2: Tranzaksyon nested (transactions/UID/ID_TRANSACTION)
        else if (typeof obj === "object" && !obj.uid) {
            const itilizatèUid = kle; 
            
            for (let subKle in obj) {
                const subObj = obj[subKle];
                if (subObj && subObj.type) {
                    const subTipLower = subObj.type.toLowerCase();
                    
                    // FÈT YON FILTRAJ STRIK POU RETRÈ SÈLMAN
                    if (subTipLower.includes("retré") || subTipLower.includes("retre") || subTipLower === "withdrawal") {
                        if (!mapKliyanRetre[itilizatèUid]) {
                            mapKliyanRetre[itilizatèUid] = { uid: itilizatèUid, pendingCount: 0, lislèt: [] };
                        }

                        const nestedAmountSent = parseFloat(subObj.amount_sent || subObj.kantite || subObj.amount || subObj.montan || 0);
                        const subStatus = subObj.status || "pending";
                        const subStatusLower = subStatus.toLowerCase();

                        mapKliyanRetre[itilizatèUid].lislèt.push({
                            id: subKle,
                            amount: nestedAmountSent,
                            rezo: subObj.method || subObj.rezo || subObj.tip || "N/A",
                            status: subStatus,
                            timestamp: subObj.date || subObj.timestamp || 0,
                            isNested: true,
                            parentUid: itilizatèUid
                        });

                        if (subStatusLower === "pending" || subStatusLower === "an atant" || subStatusLower === "en attente") {
                            mapKliyanRetre[itilizatèUid].pendingCount += 1;
                        }
                    }
                }
            }
        }
    }
    return mapKliyanRetre;
}

/**
 * Rann lis avatar kliyan yo nan sidebar gòch la (Moun ki gen retrè sèlman)
 */
function rannKliyanRetreSidebar(db) {
    const sidebarDiv = document.getElementById('div-clients-retre-list');
    if (!sidebarDiv) return;

    const mapKliyan = raleToutRetrePaKliyan();
    const lisKliyanMass = Object.values(mapKliyan);

    if (lisKliyanMass.length === 0) {
        sidebarDiv.innerHTML = "<p style='font-size:11px; text-align:center; color:#94a3b8; padding-top:20px;'>Pa gen okenn demann retrè</p>";
        return;
    }

    sidebarDiv.innerHTML = "";

    lisKliyanMass.forEach(ck => {
        const kontKliyan = localUsers[ck.uid];
        const nonKliyan = kontKliyan && kontKliyan.name ? kontKliyan.name : (kontKliyan && kontKliyan.fullname ? kontKliyan.fullname : `Kliyan (${ck.uid.substring(0, 4)})`);
        
        const inisyal = nonKliyan.charAt(0).toUpperCase();
        const klaseActive = selectedClientId === ck.uid ? "active" : "";
        const badjPending = ck.pendingCount > 0 ? `<span class="badge-pending">${ck.pendingCount}</span>` : "";

        const itemHtml = `
            <div class="client-retre-item ${klaseActive}" data-uid="${ck.uid}" title="${nonKliyan}">
                ${badjPending}
                <div class="client-avatar">${inisyal}</div>
            </div>
        `;
        sidebarDiv.innerHTML += itemHtml;
    });

    document.querySelectorAll('.client-retre-item').forEach(item => {
        item.addEventListener('click', function() {
            const uid = this.getAttribute('data-uid');
            selectedClientId = uid;
            
            document.querySelectorAll('.client-retre-item').forEach(i => i.classList.remove('active'));
            this.classList.add('active');

            rannTabloRetreKliyan(db, uid);
        });
    });
}

/**
 * Rann tablo a dwat ak tout detay retrè yo sèlman
 */
function rannTabloRetreKliyan(db, uid) {
    const listeRetreDiv = document.getElementById('lis-retre-container');
    if (!listeRetreDiv) return;

    const kontKliyan = localUsers[uid];
    const nonKliyan = kontKliyan && kontKliyan.name ? kontKliyan.name : (kontKliyan && kontKliyan.fullname ? kontKliyan.fullname : `Kliyan (${uid.substring(0, 6)})`);
    const balansKliyan = kontKliyan && kontKliyan.balance !== undefined ? kontKliyan.balance : 0;

    const mapKliyan = raleToutRetrePaKliyan();
    const doneKliyan = mapKliyan[uid] || { lislèt: [] };
    const tranzaksyonLiYo = doneKliyan.lislèt;

    // Triye pa dat ki pi resan
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
        
        let datTranzaksyon = 'N/A';
        if (t.timestamp) {
            if (typeof t.timestamp === 'number') {
                datTranzaksyon = new Date(t.timestamp).toLocaleString('fr-FR');
            } else {
                datTranzaksyon = t.timestamp;
            }
        }

        if (isPending) {
            aksyonTd = `
                <div class="table-actions">
                    <button class="btn-retre-table-valide btn-valide" 
                        data-id="${t.id}" 
                        data-uid="${uid}" 
                        data-amount="${t.amount}" 
                        data-nested="${t.isNested}">Validé</button>
                    <button class="btn-retre-table-anile btn-anile" 
                        data-id="${t.id}" 
                        data-uid="${uid}"
                        data-amount="${t.amount}"
                        data-nested="${t.isNested}">Anile (Remèt Lajan)</button>
                </div>
            `;
        } else {
            const klaseStati = (statusLower === "validé" || statusLower === "siksè" || statusLower === "valide") ? "validé" : "anile";
            
            const boutonPataje = (klaseStati === "validé") ? `
                <button class="btn-pataje-resi-retre" 
                    data-id="${t.id}" 
                    data-client="${nonKliyan}" 
                    data-date="${datTranzaksyon}" 
                    data-rezo="${t.rezo}" 
                    data-amount="${t.amount}" 
                    title="Pataje Resi Imaj" 
                    style="margin-left: 8px; background: #e0f2fe; border: none; padding: 4px 8px; border-radius: 4px; color: #0369a1; cursor: pointer; font-size: 11px; font-weight: bold;">
                    pataje 📲
                </button>
            ` : "";

            aksyonTd = `
                <div style="display: flex; align-items: center;">
                    <span class="table-status-text badge-status-${klaseStati}">${t.status.toUpperCase()}</span>
                    ${boutonPataje}
                </div>
            `;
        }

        tBodyRows += `
            <tr>
                <td style="font-family: monospace; font-size:11px; color:#2563eb; font-weight:bold;">${t.id}</td>
                <td style="font-size:12px; color:#64748b;">${datTranzaksyon}</td>
                <td><span class="badge-rezo">${t.rezo.toUpperCase()}</span></td>
                <td style="color:#dc2626; font-weight:bold;">- ${t.amount} HTG</td>
                <td><span class="table-status-text badge-status-${isPending ? 'pending' : ((statusLower === 'validé' || statusLower === 'siksè' || statusLower === 'valide') ? 'validé' : 'anile')}">${t.status}</span></td>
                <td>${aksyonTd}</td>
            </tr>
        `;
    });

    listeRetreDiv.innerHTML = `
        <div class="viewport-header" style="padding-bottom: 15px; margin-bottom: 20px; border-bottom: 1px solid #e2e8f0; display: flex; justify-content: space-between; align-items: center;">
            <div class="viewport-header-info">
                <h3 style="margin:0; font-size:18px; color:#0f172a;">${nonKliyan}</h3>
                <p style="margin:5px 0 0 0; font-size:12px; color:#64748b;">
                    UID: ${uid} | 
                    <strong>Balans: <span style="color:#10b981;" id="txt-balans-kliyan-retre">${balansKliyan} HTG</span></strong>
                    <button id="btn-edit-balans-retre" data-uid="${uid}" data-current="${balansKliyan}" style="background: transparent; border: none; cursor: pointer; margin-left: 5px; font-size: 13px;" title="Modifye balans">✏️</button>
                </p>
            </div>
        </div>
        <div class="table-responsive">
            <table class="admin-table" style="width:100%; border-collapse:collapse; text-align:left;">
                <thead>
                    <tr>
                        <th>ID Tranzaksyon</th>
                        <th>Dat / Lè</th>
                        <th>Rezo / Metòd</th>
                        <th>Montan Retrè</th>
                        <th>Stati</th>
                        <th>Aksyon / Eta</th>
                    </tr>
                </thead>
                <tbody>
                    ${tBodyRows || `<tr><td colspan="6" style="text-align:center; color:#94a3b8; padding:20px;">Kliyan sa a pa gen okenn tranzaksyon retrè.</td></tr>`}
                </tbody>
            </table>
        </div>
    `;

    ekouteBoutonAksyonRetre(db);
}

function ekouteBoutonAksyonRetre(db) {
    // 1. Edite Balans dirèkteman
    const btnEditBalans = document.getElementById('btn-edit-balans-retre');
    if (btnEditBalans) {
        btnEditBalans.addEventListener('click', function() {
            const clientUid = this.getAttribute('data-uid');
            const kouranBalans = this.getAttribute('data-current');
            const nouvoBalans = prompt(`Modifikasyon Balans:\n\nBalans aktyèl: ${kouranBalans} HTG`, kouranBalans);
            
            if (nouvoBalans !== null) {
                const valèChif = parseFloat(nouvoBalans);
                if (!isNaN(valèChif) && valèChif >= 0) {
                    update(ref(db), { [`users/${clientUid}/balance`]: valèChif });
                }
            }
        });
    }

    // 2. Kreyasyon ak Pataje Resi Imaj
    document.querySelectorAll('.btn-pataje-resi-retre').forEach(btn => {
        btn.addEventListener('click', function() {
            const tId = this.getAttribute('data-id');
            const tClient = this.getAttribute('data-client');
            const tDate = this.getAttribute('data-date');
            const tRezo = this.getAttribute('data-rezo').toUpperCase();
            const tAmount = this.getAttribute('data-amount') + " HTG";

            const canvas = document.createElement('canvas');
            canvas.width = 500;
            canvas.height = 600;
            const ctx = canvas.getContext('2d');

            ctx.fillStyle = "#ffffff";
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            ctx.strokeStyle = "#dc2626"; 
            ctx.lineWidth = 10;
            ctx.strokeRect(0, 0, canvas.width, canvas.height);

            ctx.fillStyle = "#dc2626";
            ctx.fillRect(5, 5, canvas.width - 10, 90);

            ctx.fillStyle = "#ffffff";
            ctx.font = "bold 26px Arial";
            ctx.textAlign = "center";
            ctx.fillText("ECHANJ PLUS", canvas.width / 2, 45);
            ctx.font = "14px Arial";
            ctx.fillText("Resi Ofisyèl Retrè", canvas.width / 2, 75);

            ctx.textAlign = "left";
            ctx.fillStyle = "#334155";
            ctx.font = "bold 14px Arial";

            let y = 150;
            const liy = (tit, valè, isRed = false) => {
                ctx.fillStyle = "#64748b";
                ctx.font = "normal 14px Arial";
                ctx.fillText(tit, 40, y);
                
                ctx.fillStyle = isRed ? "#dc2626" : "#0f172a";
                ctx.font = "bold 15px Arial";
                ctx.fillText(valè, 200, y);
                
                ctx.strokeStyle = "#e2e8f0";
                ctx.lineWidth = 1;
                ctx.beginPath();
                ctx.moveTo(40, y + 12);
                ctx.lineTo(460, y + 12);
                ctx.stroke();
                
                y += 50;
            };

            liy("ID Tranzaksyon:", tId);
            liy("Kliyan:", tClient);
            liy("Dat / Lè:", tDate);
            liy("Metòd / Rezo:", tRezo);
            liy("Montan Debite:", tAmount, true);
            liy("Stati:", "VALIDÉ / REYISI");

            ctx.fillStyle = "#f8fafc";
            ctx.fillRect(10, canvas.height - 80, canvas.width - 20, 70);
            ctx.textAlign = "center";
            ctx.fillStyle = "#475569";
            ctx.font = "italic 13px Arial";
            ctx.fillText("Mèsi pou konfyans ou nan Echanj Plus!", canvas.width / 2, canvas.height - 45);

            canvas.toBlob((blob) => {
                const file = new File([blob], `Retre-${tId}.png`, { type: 'image/png' });
                if (navigator.share && navigator.canShare && navigator.canShare({ files: [file] })) {
                    navigator.share({ files: [file], title: `Resi Retrè - ${tId}` });
                } else {
                    const a = document.createElement('a');
                    a.href = canvas.toDataURL('image/png');
                    a.download = `Resi-Retre-${tId}.png`;
                    a.click();
                }
            }, 'image/png');
        });
    });

    // 3. Valide Retrè
    document.querySelectorAll('.btn-retre-table-valide').forEach(btn => {
        btn.addEventListener('click', function() {
            const transId = this.getAttribute('data-id');
            const clientUid = this.getAttribute('data-uid');
            const isNested = this.getAttribute('data-nested') === "true";

            if (confirm(`Èske ou vle valide retrè ${transId} lan?`)) {
                this.disabled = true;
                const pathStatus = isNested ? `/transactions/${clientUid}/${transId}/status` : `/transactions/${transId}/status`;
                
                const updates = {};
                updates[pathStatus] = "Validé";

                update(ref(db), updates)
                .then(() => alert("Retrè a valide avèk siksè!"))
                .catch(() => { this.disabled = false; alert("Erè."); });
            }
        });
    });

    // 4. Anile Retrè (Remèt lajan an sou balans kliyan an)
    document.querySelectorAll('.btn-retre-table-anile').forEach(btn => {
        btn.addEventListener('click', function() {
            const transId = this.getAttribute('data-id');
            const clientUid = this.getAttribute('data-uid');
            const isNested = this.getAttribute('data-nested') === "true";
            const montan = parseFloat(this.getAttribute('data-amount'));

            if (confirm(`Èske ou vle anile retrè sa a?\n\nMontan ${montan} HTG a pral tounen sou balans li.`)) {
                this.disabled = true;
                const pathStatus = isNested ? `/transactions/${clientUid}/${transId}/status` : `/transactions/${transId}/status`;
                
                const updates = {};
                updates[pathStatus] = "Anile";

                const clientBalanceRef = ref(db, `users/${clientUid}/balance`);
                
                runTransaction(clientBalanceRef, (currentBalance) => {
                    return (currentBalance || 0) + montan;
                })
                .then(() => update(ref(db), updates))
                .then(() => alert("Retrè anile! Lajan an tounen sou kont kliyan an."))
                .catch(() => { this.disabled = false; alert("Erè."); });
            }
        });
    });
}
