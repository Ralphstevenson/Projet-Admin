/* ============================================================
   ECHANJ PLUS - ADMIN ECHANJ CORE (MIZAJOU AK KORIKSYON BUGS)
   ============================================================ */
import { ref, get, update, onValue } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-database.js";

export function initAdminEchanj(db) {
    if (!db) return;

    // 1. Chaje ak koute konfigirasyon yo
    loadEchanjSettings(db);

    // 2. Koute epi afiche tout demann echanj yo
    listenToEchanjOrders(db);

    // 3. Bouton sovgad paramèt yo
    const btnSave = document.getElementById('btn-save-echanj-settings');
    if (btnSave) {
        btnSave.onclick = async (e) => {
            e.preventDefault();
            await saveEchanjSettings(db, btnSave);
        };
    }

    // 4. Fèmen Modal Bwat Transaksyon
    const btnCloseModal = document.getElementById('btn-close-tx-modal');
    if (btnCloseModal) {
        btnCloseModal.onclick = () => {
            const modal = document.getElementById('modal-user-transactions');
            if (modal) modal.classList.add('hidden');
        };
    }
}

// 1. CHAJE PARAMÈT YO NAN "settings"
function loadEchanjSettings(db) {
    const feeInput = document.getElementById('admin-system-fee');
    const switchInput = document.getElementById('admin-exchange-switch');
    const digicelInput = document.getElementById('admin-digicel-num');
    const natcomInput = document.getElementById('admin-natcom-num');

    onValue(ref(db, 'settings'), (snapshot) => {
        if (snapshot.exists()) {
            const data = snapshot.val();
            if (feeInput) feeInput.value = data.systemFee !== undefined ? data.systemFee : 16.5;
            // Si li pa egziste ankò, pa defo n ap mete l sou true pou l pa bloke kliyan yo
            if (switchInput) switchInput.checked = data.exchangeActive !== undefined ? data.exchangeActive : true;
            if (digicelInput) digicelInput.value = data.digicelNumber || "50947111123";
            if (natcomInput) natcomInput.value = data.natcomNumber || "32160708";
        } else {
            // Si node settings la tou nèf, force switch la sou TRUE
            if (switchInput) switchInput.checked = true;
        }
    });
}

// 2. SOVE PARAMÈT YO NAN "settings"
async function saveEchanjSettings(db, btnElement) {
    const feeInput = document.getElementById('admin-system-fee');
    const switchInput = document.getElementById('admin-exchange-switch');
    const digicelInput = document.getElementById('admin-digicel-num');
    const natcomInput = document.getElementById('admin-natcom-num');

    let rawFee = feeInput ? feeInput.value.toString().replace(',', '.') : "16.5";
    const systemFee = parseFloat(rawFee) || 16.5;
    const exchangeActive = switchInput ? switchInput.checked : true;
    const digicelNumber = digicelInput ? digicelInput.value.trim() : "50947111123";
    const natcomNumber = natcomInput ? natcomInput.value.trim() : "32160708";

    const originalContent = btnElement.innerHTML;
    btnElement.disabled = true;
    btnElement.innerHTML = `<i class="fa-solid fa-spinner fa-spin"></i> Ap anrejistre...`;

    try {
        const updates = {};
        updates['settings/systemFee'] = systemFee;
        updates['settings/exchangeActive'] = exchangeActive; // Zòn sa a debloke kliyan yo lè l se true
        updates['settings/digicelNumber'] = digicelNumber;
        updates['settings/natcomNumber'] = natcomNumber;

        await update(ref(db), updates);

        btnElement.style.background = "#22c55e";
        btnElement.innerHTML = `<i class="fa-solid fa-check"></i> Anrejistre ak Siksè!`;

        setTimeout(() => {
            btnElement.disabled = false;
            btnElement.style.background = "";
            btnElement.innerHTML = originalContent;
        }, 2000);

    } catch (error) {
        alert("❌ Erè nan sovgad: " + error.message);
        btnElement.disabled = false;
        btnElement.innerHTML = originalContent;
    }
}

// 3. TABLO PRENSIPAL AFICHAJ ECHANJ YO (SANS BLOKAJ)
function listenToEchanjOrders(db) {
    const tableBody = document.getElementById('admin-echanj-table-body');
    if (!tableBody) return;

    onValue(ref(db, 'transactions'), (snapshot) => {
        tableBody.innerHTML = '';

        if (!snapshot.exists()) {
            tableBody.innerHTML = `<tr><td colspan="8" style="text-align:center; padding:20px; color:#94a3b8;">Pa gen okenn demann echanj nan baz done a.</td></tr>`;
            return;
        }

        const orders = snapshot.val();
        let hasEchanjData = false;

        const sortedKeys = Object.keys(orders).sort((a, b) => {
            const timeA = orders[a].timestamp || 0;
            const timeB = orders[b].timestamp || 0;
            return timeB - timeA;
        });

        sortedKeys.forEach(key => {
            const item = orders[key];

            // Filtre sèlman echanj yo
            if (item.type === "echanj" || key.startsWith("ECH-") || item.rezo) {
                hasEchanjData = true;
                const tr = document.createElement('tr');

                const status = item.status || "pending";
                let statusBadge = `<span style="color: #f59e0b; font-weight: bold; background: rgba(245, 158, 11, 0.15); padding: 4px 8px; border-radius: 4px;">Pending</span>`;
                
                if (status === "Validé" || status === "Approuvé") {
                    statusBadge = `<span style="color: #22c55e; font-weight: bold; background: rgba(34, 197, 94, 0.15); padding: 4px 8px; border-radius: 4px;">Validé</span>`;
                } else if (status === "Refusé" || status === "Annulé") {
                    statusBadge = `<span style="color: #ef4444; font-weight: bold; background: rgba(239, 68, 68, 0.15); padding: 4px 8px; border-radius: 4px;">Refusé</span>`;
                }

                const dateStr = item.timestamp ? new Date(item.timestamp).toLocaleString('fr-FR') : '---';
                
                const clientName = item.fullname || item.full_name || 'Kliyan ARS';
                const arsId = item.ars_id || item.arsID || (item.uid ? item.uid.substring(0, 6) : 'N/A');
                
                const rezo = item.rezo || 'Digicel';
                const minitVoye = item.amount || 0;
                const netHTG = item.to_receive || 0;
                const uid = item.uid || '';

                tr.innerHTML = `
                    <td style="padding:12px;"><b>${key.substring(0, 14)}</b><br><small style="color: #94a3b8;">${dateStr}</small></td>
                    <td style="padding:12px;"><b>${clientName}</b><br><small style="color: #fbbf24;">ARS ID: ${arsId}</small></td>
                    <td style="padding:12px;"><b style="text-transform: uppercase; color: #f59e0b;">${rezo}</b></td>
                    <td style="padding:12px;"><b>${minitVoye} HTG</b></td>
                    <td style="padding:12px;">16.5%</td>
                    <td style="padding:12px;"><b style="color: #22c55e; font-size: 1.05em;">${netHTG} HTG</b></td>
                    <td style="padding:12px;">${statusBadge}</td>
                    <td style="padding:12px;">
                        <button class="btn-open-box" data-uid="${uid}" data-name="${clientName}" data-ars="${arsId}" style="background: #0284c7; color: white; border: none; padding: 6px 10px; border-radius: 6px; cursor: pointer; font-weight: bold;">
                            <i class="fa-solid fa-box-open"></i> Bwat Kliyan
                        </button>
                    </td>
                `;
                tableBody.appendChild(tr);
            }
        });

        // Koute klik sou bouton Bwat Kliyan yo
        document.querySelectorAll('.btn-open-box').forEach(btn => {
            btn.onclick = () => {
                const uid = btn.getAttribute('data-uid');
                const name = btn.getAttribute('data-name');
                const ars = btn.getAttribute('data-ars');
                openUserTransactionBox(db, uid, name, ars, orders);
            };
        });

        if (!hasEchanjData) {
            tableBody.innerHTML = `<tr><td colspan="8" style="text-align:center; padding:20px; color:#94a3b8;">Pa gen okenn demann echanj nan baz done a.</td></tr>`;
        }
    }, (error) => {
        console.error("Erè Realtime Database:", error);
        tableBody.innerHTML = `<tr><td colspan="8" style="text-align:center; padding:20px; color:#ef4444;">Erè nan chajman done: ${error.message}</td></tr>`;
    });
}

// 4. BWAT TRANSAKSYON KLIYAN
function openUserTransactionBox(db, uid, clientName, arsId, allOrders) {
    const modal = document.getElementById('modal-user-transactions');
    const modalInfo = document.getElementById('modal-client-info');
    const container = document.getElementById('user-tx-list-container');

    if (!modal || !container) return;

    modalInfo.innerText = `ARS-ID: ${arsId} | Kliyan: ${clientName}`;
    container.innerHTML = '';

    const userOrdersKeys = Object.keys(allOrders).filter(k => allOrders[k].uid === uid);

    if (userOrdersKeys.length === 0) {
        container.innerHTML = `<p style="text-align:center; color:#94a3b8; padding:20px;">Pa gen transaksyon nan bwat sa a.</p>`;
    } else {
        userOrdersKeys.forEach(txKey => {
            const tx = allOrders[txKey];
            const dateStr = tx.timestamp ? new Date(tx.timestamp).toLocaleString('fr-FR') : '---';
            const status = tx.status || "pending";
            const minit = tx.amount || 0;
            const netHTG = tx.to_receive || 0;
            const rezo = tx.rezo || 'Digicel';

            const boxCard = document.createElement('div');
            boxCard.style.cssText = "background: #0f172a; border: 1px solid #334155; border-radius: 8px; padding: 12px; margin-bottom: 10px; font-family: monospace;";

            boxCard.innerHTML = `
                <div style="display:flex; justify-content:space-between; color:#38bdf8; font-weight:bold;">
                    <span>CODE: ${txKey}</span>
                    <span style="color:${status === 'Validé' ? '#22c55e' : status === 'Refusé' ? '#ef4444' : '#f59e0b'}">${status}</span>
                </div>
                <div style="margin-top: 6px; font-size: 0.9em; color:#cbd5e1;">
                    📌 <b>Dat:</b> ${dateStr}<br>
                    📡 <b>Rezo:</b> ${rezo.toUpperCase()}<br>
                    📥 <b>Minit Voye:</b> ${minit} HTG<br>
                    💵 <b>HTG pou Peye:</b> <span style="color:#22c55e; font-weight:bold;">${netHTG} HTG</span>
                </div>
                ${status === 'pending' ? `
                    <div style="margin-top: 10px; display:flex; gap: 10px;">
                        <button class="btn-valide-tx" data-id="${txKey}" data-uid="${uid}" data-amount="${netHTG}" style="flex:1; background:#16a34a; color:#fff; border:none; padding:6px; border-radius:4px; cursor:pointer; font-weight:bold;">
                            <i class="fa-solid fa-check"></i> Valide
                        </button>
                        <button class="btn-refuse-tx" data-id="${txKey}" style="flex:1; background:#dc2626; color:#fff; border:none; padding:6px; border-radius:4px; cursor:pointer; font-weight:bold;">
                            <i class="fa-solid fa-xmark"></i> Refize
                        </button>
                    </div>
                ` : ''}
            `;
            container.appendChild(boxCard);
        });

        container.querySelectorAll('.btn-valide-tx').forEach(b => {
            b.onclick = async () => {
                const txID = b.getAttribute('data-id');
                const u = b.getAttribute('data-uid');
                const amt = parseFloat(b.getAttribute('data-amount')) || 0;
                await handleValideEchanj(db, txID, u, amt);
                modal.classList.add('hidden');
            };
        });

        container.querySelectorAll('.btn-refuse-tx').forEach(b => {
            b.onclick = async () => {
                const txID = b.getAttribute('data-id');
                await handleRefuseEchanj(db, txID);
                modal.classList.add('hidden');
            };
        });
    }

    modal.classList.remove('hidden');
}

// 5. FONKSYON MIZAJOU NAN DATABASE
async function handleValideEchanj(db, transID, uid, montanPouAjoute) {
    if (!confirm(`Valide echanj sa a epi ajoute ${montanPouAjoute} HTG sou solde kliyan an?`)) return;

    try {
        const updates = {};
        updates[`transactions/${transID}/status`] = "Validé";

        await update(ref(db), updates);

        if (uid) {
            const userRef = ref(db, `users/${uid}`);
            const userSnap = await get(userRef);
            if (userSnap.exists()) {
                const currentBalance = parseFloat(userSnap.val().balance || 0);
                const newBalance = currentBalance + montanPouAjoute;
                await update(userRef, { balance: newBalance });
            }
        }

        alert("✅ Demann echanj la VALIDÉ ak siksè!");
    } catch (err) {
        alert("❌ Erè pandan validasyon an: " + err.message);
    }
}

async function handleRefuseEchanj(db, transID) {
    if (!confirm("Èske ou sèten ou vle REFIZE demann echanj sa a?")) return;

    try {
        const updates = {};
        updates[`transactions/${transID}/status`] = "Refusé";

        await update(ref(db), updates);
        alert("🚫 Demann echanj la REFIZE.");
    } catch (err) {
        alert("❌ Erè pandan operasyon an: " + err.message);
    }
                   }
               
