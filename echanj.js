/* ============================================================
   ECHANJ PLUS - MODULE ADMIN ECHANJ (admin-echanj.js)
   ============================================================ */
import { ref, get, update, onValue } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-database.js";

export function initAdminEchanj(db) {
    if (!db) {
        console.error("Firebase DB pa pase nan initAdminEchanj!");
        return;
    }

    console.log("Sèvis Admin Echanj demare ak siksè...");

    // 1. Chaje paramèt yo nan node 'settings'
    loadEchanjSettings(db);

    // 2. Koute epi afiche demann yo an tan reyèl soti nan 'transactions'
    listenToEchanjOrders(db);

    // 3. Bouton Sove Paramèt yo
    const btnSave = document.getElementById('btn-save-echanj-settings');
    if (btnSave) {
        btnSave.onclick = async (e) => {
            e.preventDefault();
            await saveEchanjSettings(db, btnSave);
        };
    }

    // 4. Aksyon Valide / Refize sou tablo a
    setupTableActions(db);
}

// ------------------------------------------------------------
// 1. CHAJE PARAMÈT YO (SETTINGS)
// ------------------------------------------------------------
function loadEchanjSettings(db) {
    const feeInput = document.getElementById('admin-system-fee');
    const switchInput = document.getElementById('admin-exchange-switch');
    const digicelInput = document.getElementById('admin-digicel-num');
    const natcomInput = document.getElementById('admin-natcom-num');

    onValue(ref(db, 'settings'), (snapshot) => {
        if (snapshot.exists()) {
            const data = snapshot.val();
            if (feeInput) feeInput.value = data.systemFee !== undefined ? data.systemFee : 16.5;
            if (switchInput) switchInput.checked = data.exchangeActive !== undefined ? data.exchangeActive : true;
            if (digicelInput) digicelInput.value = data.digicelNumber || "50947111123";
            if (natcomInput) natcomInput.value = data.natcomNumber || "32160708";
        }
    });
}

// ------------------------------------------------------------
// 2. SOVE PARAMÈT YO (SETTINGS)
// ------------------------------------------------------------
async function saveEchanjSettings(db, btnElement) {
    const feeInput = document.getElementById('admin-system-fee');
    const switchInput = document.getElementById('admin-exchange-switch');
    const digicelInput = document.getElementById('admin-digicel-num');
    const natcomInput = document.getElementById('admin-natcom-num');

    // Konvèti virgul nan pwen otomatikman
    let rawFee = feeInput ? feeInput.value.toString().replace(',', '.') : "16.5";
    const feeValue = parseFloat(rawFee) || 16.5;

    const exchangeActive = switchInput ? switchInput.checked : true;
    const digicelNum = digicelInput ? digicelInput.value.trim() : "50947111123";
    const natcomNum = natcomInput ? natcomInput.value.trim() : "32160708";

    // Efè sou bouton an pou montre aksyon an ap fèt
    const originalContent = btnElement.innerHTML;
    btnElement.disabled = true;
    btnElement.innerHTML = `<i class="fa-solid fa-spinner fa-spin"></i> Ap anrejistre...`;

    try {
        const updates = {};
        updates['settings/systemFee'] = feeValue;
        updates['settings/exchangeActive'] = exchangeActive;
        updates['settings/digicelNumber'] = digicelNum;
        updates['settings/natcomNumber'] = natcomNum;

        await update(ref(db), updates);

        if (feeInput) feeInput.value = feeValue;

        btnElement.style.background = "#22c55e";
        btnElement.innerHTML = `<i class="fa-solid fa-check"></i> Anrejistre ak Siksè!`;

        setTimeout(() => {
            btnElement.disabled = false;
            btnElement.style.background = "";
            btnElement.innerHTML = originalContent;
        }, 2000);

    } catch (error) {
        console.error("Erè Sove Settings:", error);
        alert("❌ Erè nan sovgad: " + error.message);
        btnElement.disabled = false;
        btnElement.innerHTML = originalContent;
    }
}

// ------------------------------------------------------------
// 3. AFICHE TRANZAKSYON ECHANJ YO ('ECH-')
// ------------------------------------------------------------
function listenToEchanjOrders(db) {
    const tableBody = document.getElementById('admin-echanj-table-body');
    if (!tableBody) return;

    onValue(ref(db, 'transactions'), (snapshot) => {
        tableBody.innerHTML = '';

        if (!snapshot.exists()) {
            tableBody.innerHTML = `<tr><td colspan="8" style="text-align:center; padding:20px; color:#94a3b8;">Pa gen okenn demann echanj pou kounye a.</td></tr>`;
            return;
        }

        const orders = snapshot.val();
        let hasEchanj = false;

        // Triye alfabetik & pa dat desandan
        const sortedKeys = Object.keys(orders).sort((a, b) => (orders[b].timestamp || 0) - (orders[a].timestamp || 0));

        sortedKeys.forEach(key => {
            const item = orders[key];

            // Tcheke si se yon kle ECH- oswa si se yon tip Echanj
            const isEchanj = key.startsWith("ECH-") || 
                             item.type === "Echanj" || 
                             item.rezo || 
                             item.network ||
                             (item.description && item.description.toLowerCase().includes("echanj"));

            if (isEchanj) {
                hasEchanj = true;

                const tr = document.createElement('tr');

                // Statut Badge
                let statusBadge = `<span style="color: #f59e0b; font-weight: bold; background: rgba(245, 158, 11, 0.15); padding: 4px 8px; border-radius: 4px;">En attente</span>`;
                if (item.status === "Validé" || item.status === "Approuvé") {
                    statusBadge = `<span style="color: #22c55e; font-weight: bold; background: rgba(34, 197, 94, 0.15); padding: 4px 8px; border-radius: 4px;">Validé</span>`;
                } else if (item.status === "Refusé" || item.status === "Annulé") {
                    statusBadge = `<span style="color: #ef4444; font-weight: bold; background: rgba(239, 68, 68, 0.15); padding: 4px 8px; border-radius: 4px;">Refusé</span>`;
                }

                // Formatage Done yo
                const dateStr = item.timestamp ? new Date(item.timestamp).toLocaleString('fr-FR') : '---';
                const clientName = item.fullname || item.userName || item.user_name || 'Kliyan';
                const clientPhone = item.phone || item.userPhone || item.user_phone || '';
                const rezo = item.rezo || item.network || 'Digicel/Natcom';
                const minitVoye = item.amount_sent || item.minit || item.amount || 0;
                const feePercent = item.applied_fee_percent || item.fee_percent || item.fee || 16.5;
                const netHTG = item.htg_to_receive || item.net_amount || item.amount_received || 0;

                tr.innerHTML = `
                    <td style="padding:12px;"><b>${key.substring(0, 12)}</b><br><small style="color: #94a3b8;">${dateStr}</small></td>
                    <td style="padding:12px;"><b>${clientName}</b><br><small style="color: #38bdf8;">${clientPhone}</small></td>
                    <td style="padding:12px;"><b style="text-transform: uppercase; color: #f59e0b;">${rezo}</b></td>
                    <td style="padding:12px;"><b>${minitVoye} HTG</b></td>
                    <td style="padding:12px;">${feePercent}%</td>
                    <td style="padding:12px;"><b style="color: #22c55e; font-size:1.05em;">${netHTG} HTG</b></td>
                    <td style="padding:12px;">${statusBadge}</td>
                    <td style="padding:12px;">
                        ${(!item.status || item.status === "En attente") ? `
                            <button class="btn-approve-order" data-id="${key}" data-uid="${item.uid || ''}" data-amount="${netHTG}" style="background: #16a34a; color: white; border: none; padding: 6px 10px; border-radius: 6px; cursor: pointer; margin-right: 4px; font-weight:bold;">
                                <i class="fa-solid fa-check"></i> Valide
                            </button>
                            <button class="btn-cancel-order" data-id="${key}" data-uid="${item.uid || ''}" style="background: #dc2626; color: white; border: none; padding: 6px 10px; border-radius: 6px; cursor: pointer; font-weight:bold;">
                                <i class="fa-solid fa-xmark"></i> Refize
                            </button>
                        ` : `<small style="color: #64748b; font-weight: bold;">${item.status}</small>`}
                    </td>
                `;
                tableBody.appendChild(tr);
            }
        });

        if (!hasEchanj) {
            tableBody.innerHTML = `<tr><td colspan="8" style="text-align:center; padding:20px; color:#94a3b8;">Pa gen okenn demann echanj pou kounye a.</td></tr>`;
        }
    });
}

// ------------------------------------------------------------
// 4. VALIDE / REFIZE TRANZAKSYON YO
// ------------------------------------------------------------
function setupTableActions(db) {
    const tableBody = document.getElementById('admin-echanj-table-body');
    if (!tableBody) return;

    tableBody.onclick = async (e) => {
        const btnApprove = e.target.closest('.btn-approve-order');
        const btnCancel = e.target.closest('.btn-cancel-order');

        if (btnApprove) {
            const transID = btnApprove.getAttribute('data-id');
            const uid = btnApprove.getAttribute('data-uid');
            const amountNet = parseFloat(btnApprove.getAttribute('data-amount')) || 0;
            await handleValideEchanj(db, transID, uid, amountNet);
        }

        if (btnCancel) {
            const transID = btnCancel.getAttribute('data-id');
            const uid = btnCancel.getAttribute('data-uid');
            await handleRefuseEchanj(db, transID, uid);
        }
    };
}

async function handleValideEchanj(db, transID, uid, montanPouAjoute) {
    if (!confirm(`Valide echanj sa a epi ajoute ${montanPouAjoute} HTG sou solde kliyan an?`)) return;

    try {
        const updates = {};
        updates[`transactions/${transID}/status`] = "Validé";
        updates[`admin_orders/${transID}/status`] = "Validé";

        if (uid) {
            updates[`users/${uid}/user_transactions/${transID}/status`] = "Validé";
        }

        await update(ref(db), updates);

        // Ajoute lajan an sou kòb kliyan an nan Realtime Database
        if (uid) {
            const userRef = ref(db, `users/${uid}`);
            const userSnap = await get(userRef);
            if (userSnap.exists()) {
                const currentBalance = parseFloat(userSnap.val().balance || 0);
                const newBalance = currentBalance + montanPouAjoute;
                await update(userRef, { balance: newBalance });
            }
        }

        alert("✅ Demann echanj sa a VALIDÉ ak siksè!");
    } catch (err) {
        console.error("Erè Validasyon:", err);
        alert("❌ Erè pandan validasyon an: " + err.message);
    }
}

async function handleRefuseEchanj(db, transID, uid) {
    if (!confirm("Èske ou sèten ou vle REFIZE demann sa a?")) return;

    try {
        const updates = {};
        updates[`transactions/${transID}/status`] = "Refusé";
        updates[`admin_orders/${transID}/status`] = "Refusé";

        if (uid) {
            updates[`users/${uid}/user_transactions/${transID}/status`] = "Refusé";
        }

        await update(ref(db), updates);
        alert("🚫 Demann echanj la REFIZE kòrèkteman.");
    } catch (err) {
        console.error("Erè Refize:", err);
        alert("❌ Erè pandan operasyon an: " + err.message);
    }
}
   
