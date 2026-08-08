// ============================================================
// ECHANJ PLUS - ADMIN ECHANJ LOGIC (admin-echanj.js)
// ============================================================

import { ref, onValue, update, runTransaction } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-database.js";

// Done lokal pou evite repete apèl initil
let localTransactions = {};
let localUsers = {};
let selectedClientId = null;

const IMAJ_AKEY_URL = "https://i.postimg.cc/qRS0rchG/1786118534528.png";

// --- KONFIGIRASYON ONESIGNAL (MATCH AK NOUVO SDK KLIYAN AN) ---
const ONESIGNAL_APP_ID = "53388648-9930-407e-a1be-c5a71da81b7a";
const ONESIGNAL_REST_KEY = "os_v2_app_km4imsezgbah5in6yxtr3ka3plfzpnnuafeu3nmk4tvudggdotxrish26rryofcms5bhzgyyxixhjrabzeetaz7rnhecizgoj4onvva";

// Fonksyon pou voye notifikasyon push bay kliyan an via OneSignal API
async function voyeNotifikasyonKliyan(clientUid, mesaj) {
    try {
        const response = await fetch("https://onesignal.com/api/v1/notifications", {
            method: "POST",
            headers: {
                "Content-Type": "application/json; charset=utf-8",
                "Authorization": `Basic ${ONESIGNAL_REST_KEY}`
            },
            body: JSON.stringify({
                app_id: ONESIGNAL_APP_ID,
                target_channel: "push",
                include_aliases: {
                    external_id: [clientUid]
                },
                headings: { en: "Echanj Plus", fr: "Echanj Plus" },
                contents: { en: mesaj, fr: mesaj }
            })
        });
        const resData = await response.json();
        console.log("OneSignal API Repons:", resData);
    } catch (error) {
        console.error("Erè lè w ap kontakte sèvè OneSignal:", error);
    }
}

export function initAdminEchanj(db) {
    console.log("Seksyon Echanj aktive: Resi an Imaj & Modifikasyon Balans pare!");

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
            if (tipLower.includes("echanj") || tipLower.includes("retré") || tipLower.includes("retre")) {
                const uid = obj.uid;
                if (!mapKliyanEchanj[uid]) {
                    mapKliyanEchanj[uid] = { uid: uid, pendingCount: 0, lislèt: [] };
                }
                
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
            
            // Si li deja verifye (Validé/Siksè), nou ajoute bouton pou pataje resi a kòm Imaj
            const boutonPataje = (klaseStati === "validé") ? `
                <button class="btn-pataje-resi" 
                    data-id="${t.id}" 
                    data-client="${nonKliyan}" 
                    data-date="${datTranzaksyon}" 
                    data-rezo="${t.rezo}" 
                    data-amount="${t.amount}" 
                    data-receive="${t.to_receive}" 
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
                <td><strong style="color:#1e293b;">${t.amount}</strong> HTG</td>
                <td style="color:#16a34a; font-weight:bold;">+ ${t.to_receive} HTG</td>
                <td><span class="table-status-text badge-status-${isPending ? 'pending' : ((statusLower === 'validé' || statusLower === 'siksè' || statusLower === 'valide') ? 'validé' : 'anile')}">${t.status}</span></td>
                <td>${aksyonTd}</td>
            </tr>
        `;
    });

    listeEchanjDiv.innerHTML = `
        <div class="viewport-header" style="padding-bottom: 15px; margin-bottom: 20px; border-bottom: 1px solid #e2e8f0; display: flex; justify-content: space-between; align-items: center;">
            <div class="viewport-header-info">
                <h3 style="margin:0; font-size:18px; color:#0f172a;">${nonKliyan}</h3>
                <p style="margin:5px 0 0 0; font-size:12px; color:#64748b;">
                    UID: ${uid} | 
                    <strong>Balans: <span style="color:#10b981;" id="txt-balans-kliyan">${balansKliyan} HTG</span></strong>
                    <button id="btn-edit-balans" data-uid="${uid}" data-current="${balansKliyan}" style="background: transparent; border: none; cursor: pointer; margin-left: 5px; font-size: 13px;" title="Modidye balans kliyan sa a">✏️</button>
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
    // Modifikasyon Balans Kliyan an dirèkteman
    const btnEditBalans = document.getElementById('btn-edit-balans');
    if (btnEditBalans) {
        btnEditBalans.addEventListener('click', function() {
            const clientUid = this.getAttribute('data-uid');
            const kouranBalans = this.getAttribute('data-current');
            
            const nouvoBalansKliyan = prompt(`Modifikasyon Balans pou sekirite (Tranzaksyon Sispèk)\n\nBalans aktyèl: ${kouranBalans} HTG\nAntre nouvo balans lan:`, kouranBalans);
            
            if (nouvoBalansKliyan !== null) {
                const valèChif = parseFloat(nouvoBalansKliyan);
                if (isNaN(valèChif) || valèChif < 0) {
                    alert("Erè: Ou dwe antre yon chif ki valid!");
                    return;
                }
                
                if (confirm(`Èske ou sèten ou vle chanje balans kliyan sa a pou l vin nèt: ${valèChif} HTG?`)) {
                    update(ref(db), { [`users/${clientUid}/balance`]: valèChif })
                    .then(() => {
                        alert("Balans lan modifye avèk siksè!");
                    })
                    .catch(err => {
                        console.error(err);
                        alert("Erè pandan mizajou balans lan.");
                    });
                }
            }
        });
    }

    // Pataje resi kòm Imaj pa HTML Canvas natif
    document.querySelectorAll('.btn-pataje-resi').forEach(btn => {
        btn.addEventListener('click', function() {
            const tId = this.getAttribute('data-id');
            const tClient = this.getAttribute('data-client');
            const tDate = this.getAttribute('data-date');
            const tRezo = this.getAttribute('data-rezo').toUpperCase();
            const tAmount = this.getAttribute('data-amount') + " HTG";
            const tReceive = this.getAttribute('data-receive') + " HTG";

            const canvas = document.createElement('canvas');
            canvas.width = 500;
            canvas.height = 650;
            const ctx = canvas.getContext('2d');

            ctx.fillStyle = "#ffffff";
            ctx.fillRect(0, 0, canvas.width, canvas.height);

            ctx.strokeStyle = "#1e3a8a";
            ctx.lineWidth = 10;
            ctx.strokeRect(0, 0, canvas.width, canvas.height);

            ctx.fillStyle = "#1e3a8a";
            ctx.fillRect(5, 5, canvas.width - 10, 90);

            ctx.fillStyle = "#ffffff";
            ctx.font = "bold 26px Arial";
            ctx.textAlign = "center";
            ctx.fillText("ECHANJ PLUS", canvas.width / 2, 45);
            ctx.font = "14px Arial";
            ctx.fillText("Resi Ofisyèl Tranzaksyon", canvas.width / 2, 75);

            ctx.textAlign = "left";
            ctx.fillStyle = "#334155";
            ctx.font = "bold 14px Arial";

            let y = 150;
            const liy = (tit, valè, isGreen = false) => {
                ctx.fillStyle = "#64748b";
                ctx.font = "normal 14px Arial";
                ctx.fillText(tit, 40, y);
                
                ctx.fillStyle = isGreen ? "#16a34a" : "#0f172a";
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
            liy("Montan Voye:", tAmount);
            liy("Net Resevwa:", tReceive, true);
            liy("Stati:", "VALIDÉ / SIKSÈ");

            ctx.fillStyle = "#f8fafc";
            ctx.fillRect(10, canvas.height - 80, canvas.width - 20, 70);
            
            ctx.textAlign = "center";
            ctx.fillStyle = "#475569";
            ctx.font = "italic 13px Arial";
            ctx.fillText("Mèsi paske ou chwazi Echanj Plus!", canvas.width / 2, canvas.height - 45);
            ctx.font = "bold 11px Arial";
            ctx.fillStyle = "#94a3b8";
            ctx.fillText("Sistèm Otomatize - Admin Panel", canvas.width / 2, canvas.height - 25);

            canvas.toBlob((blob) => {
                const file = new File([blob], `Resi-${tId}.png`, { type: 'image/png' });
                
                if (navigator.share && navigator.canShare && navigator.canShare({ files: [file] })) {
                    navigator.share({
                        files: [file],
                        title: `Resi Echanj Plus - ${tId}`,
                        text: `Gade resi pou tranzaksyon ${tId} sou Echanj Plus.`
                    })
                    .catch(err => console.log("Pataje anile oswa gen erè", err));
                } else {
                    const a = document.createElement('a');
                    a.href = canvas.toDataURL('image/png');
                    a.download = `Resi-${tId}.png`;
                    a.click();
                    alert("Navigatè sa a pa sipòte pataje dirèk natif, imaj resi a telechaje sou aparèy ou!");
                }
            }, 'image/png');
        });
    });

    // Bouton Validé orijinal la (ENTÈGRE AK DEKLANCHMAN NOTIFIKASYON AUTOMATIK)
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
                .then(async () => {
                    alert("Siksè! Tranzaksyon validé, kont kliyan an kredite.");
                    
                    // Deklanche notifikasyon an tan reyèl bay kliyan an
                    const mesajNotif = `Tranzaksyon ou a (${transId}) valide avèk siksè! Kont ou kredite de +${montanPoulResevwa} HTG.`;
                    await voyeNotifikasyonKliyan(clientUid, mesajNotif);
                })
                .catch((error) => {
                    console.error("Erè nan validation:", error);
                    alert("Gen yon erè ki pase. Tanpri reyezi.");
                    this.disabled = false;
                });
            }
        });
    });

    // Bouton Anile orijinal la (ENTÈGRE AK DEKLANCHMAN NOTIFIKASYON AUTOMATIK)
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
                .then(async () => {
                    alert("Tranzaksyon anile avèk siksè!");
                    
                    // Deklanche notifikasyon pou fè kliyan an konnen sa
                    const mesajNotif = `Tranzaksyon ou a (${transId}) anile pa sistèm nan. Kontakte sipò a pou plis detay.`;
                    await voyeNotifikasyonKliyan(clientUid, mesajNotif);
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
