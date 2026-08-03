/* ============================================================
   ECHANJ PLUS - MODULE ADMIN ECHANJ (admin-echanj.js)
   ============================================================ */
import { ref, get, update, onValue } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-database.js";

export function initAdminEchanj(db) {
    if (!db) {
        console.error("Firebase DB pa pase nan initAdminEchanj!");
        return;
    }

    // 1. Chaje paramèt yo (Frè, Nimewo, Switch)
    loadEchanjSettings(db);

    // 2. Koute epi afiche demann yo an tan reyèl
    listenToEchanjOrders(db);

    // 3. Delegation sou bouton Valide / Refize
    setupTableActions(db);

    // 4. Sove Paramèt yo
    const btnSave = document.getElementById('btn-save-echanj-settings');
    if (btnSave) {
        btnSave.onclick = async (e) => {
            e.preventDefault();
            await saveEchanjSettings(db);
        };
    }
}

// CHAJE PARAMÈT YO
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

// SOVE PARAMÈT YO
async function saveEchanjSettings(db) {
    const feeInput = document.getElementById('admin-system-fee');
    const switchInput = document.getElementById('admin-exchange-switch');
    const digicelInput = document.getElementById('admin-digicel-num');
    const natcomInput = document.getElementById('admin-natcom-num');

    const feeValue = feeInput ? parseFloat(feeInput.value) : 16.5;
    const exchangeActive = switchInput ? switchInput.checked : true;
    const digicelNum = digicelInput ? digicelInput.value.trim() : "50947111123";
    const natcomNum = natcomInput ? natcomInput.value.trim() : "32160708";

    try {
        const updates = {};
        updates['settings/systemFee'] = feeValue;
        updates['settings/exchangeActive'] = exchangeActive;
        updates['settings/digicelNumber'] = digicelNum;
        updates['settings/natcomNumber'] = natcomNum;

        await update(ref(db), updates);
        alert(`✅ Paramèt yo anrejistre ak siksè!\nSèvis: ${exchangeActive ? 'ACTIF (ON)' : 'BLOKÉ (OFF)'}`);
    } catch (error) {
        console.error("Erè Sove Settings:", error);
        alert("❌ Erè nan sovgad: " + error.message);
    }
}

// KOUTE DEMANN ECHANJ YO
function listenToEchanjOrders(db) {
    // Chèche tout posiblite kote container done yo ka ye nan HTML la
    const tableBody = document.getElementById('admin-echanj-table-body') || 
                      document.getElementById('echanj-orders-list') ||
                      document.querySelector('.admin-echanj-list');

    if (!tableBody) {
        console.error("Pa jwenn container pou afiche tablo echanj la!");
        return;
    }

    // Koute sou 'transactions'
    onValue(ref(db, 'transactions'), (snapshot) => {
        tableBody.innerHTML = '';

        if (!snapshot.exists()) {
            tableBody.innerHTML = `<tr><td colspan="8" style="text-align:center; padding:20px; color:#94a3b8;">Pa gen okenn demann echanj pou kounye a.</td></tr>`;
            return;
        }

        const orders = snapshot.val();
        let hasEchanj = false;

        const sortedKeys = Object.keys(orders).sort((a, b) => (orders[b].timestamp || 0) - (orders[a].timestamp || 0));

        sortedKeys.forEach(key => {
            const item = orders[key];

            // Afiche si se yon echanj oswa si gen rezo / minit anndan l
            if (item.type === "Echanj" || item.rezo || item.amount_sent || item.minit) {
                hasEchanj = true;
                const tr = document.createElement('tr');

                let statusBadge = `<span style="color: #f59e0b; font-weight: bold;">En attente</span>`;
                if (item.status === "Validé" || item.status === "Approuvé") {
                    statusBadge = `<span style="color: #22c55e; font-weight: bold;">Validé</span>`;
                } else if (item.status === "Refusé" || item.status === "Annulé") {
                    statusBadge = `<span style="color: #ef4444; font-weight: bold;">Refusé</span>`;
                }

                const dateStr = item.timestamp ? new Date(item.timestamp).toLocaleString('fr-FR') : '---';
                const netHTG = item.htg_to_receive || item.net_amount || 0;
                const minitVoye = item.amount_sent || item.minit || 0;

                tr.innerHTML = `
                    <td style="padding:12px;"><b>${key.substring(0, 8)}</b><br><small style="color: #94a3b8;">${dateStr}</small></td>
                    <td style="padding:12px;"><b>${item.fullname || 'Kliyan'}</b><br><small style="color: #38bdf8;">${item.phone || ''}</small></td>
                    <td style="padding:12px;"><b style="text-transform: uppercase; color: #f59e0b;">${item.rezo || '---'}</b></td>
                    <td style="padding:12px;">${minitVoye} HTG</td>
                    <td style="padding:12px;">${item.applied_fee_percent || 16.5}%</td>
                    <td style="padding:12px;"><b style="color: #22c55e;">${netHTG} HTG</b></td>
                    <td style="padding:12px;">${statusBadge}</td>
                    <td style="padding:12px;">
                        ${(!item.status || item.status === "En attente") ? `
                            <button class="btn-approve-order" data-id="${key}" data-uid="${item.uid}" data-amount="${netHTG}" style="background: #16a34a; color: white; border: none; padding: 6px 10px; border-radius: 6px; cursor: pointer; margin-right: 4px;">
                                Valide
                            </button>
                            <button class="btn-cancel-order" data-id="${key}" data-uid="${item.uid}" style="background: #dc2626; color: white; border: none; padding: 6px 10px; border-radius: 6px; cursor: pointer;">
                                Refize
                            </button>
                        ` : `<small style="color: #64748b;">${item.status}</small>`}
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

// SETUP EVENT DELEGATION
function setupTableActions(db) {
    document.addEventListener('click', async (e) => {
        const btnApprove = e.target.closest('.btn-approve-order');
        const btnCancel = e.target.closest('.btn-cancel-order');

        if (btnApprove) {
            const transID = btnApprove.getAttribute('data-id');
            const uid = btnApprove.getAttribute('data-uid');
            const amountNet = parseFloat(btnApprove.getAttribute('data-amount'));
            await handleValideEchanj(db, transID, uid, amountNet);
        }

        if (btnCancel) {
            const transID = btnCancel.getAttribute('data-id');
            const uid = btnCancel.getAttribute('data-uid');
            await handleRefuseEchanj(db, transID, uid);
        }
    });
}

// AKSYON VALIDE
async function handleValideEchanj(db, transID, uid, montanPouAjoute) {
    if (!confirm(`Valide echanj sa a epi ajoute ${montanPouAjoute} HTG sou kont kliyan an?`)) return;

    try {
        const updates = {};
        updates[`transactions/${transID}/status`] = "Validé";
        updates[`admin_orders/${transID}/status`] = "Validé";
        if (uid) {
            updates[`users/${uid}/user_transactions/${transID}/status`] = "Validé";
        }

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

        alert("✅ Echanj Valide ak siksè!");
    } catch (err) {
        console.error("Erè Validasyon:", err);
        alert("❌ Erè pandan validasyon an: " + err.message);
    }
}

// AKSYON REFIZE
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
        alert("🚫 Demann echanj la REFIZE.");
    } catch (err) {
        console.error("Erè Refize:", err);
        alert("❌ Erè pandan operasyon an: " + err.message);
    }
                                                                                            }
                   
