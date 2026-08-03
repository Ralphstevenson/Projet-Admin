/* ============================================================
   ECHANJ PLUS - MODULE ADMIN ECHANJ (admin-echanj.js)
   ============================================================ */
import { ref, get, update, onValue } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-database.js";

export function initAdminEchanj(db) {
    if (!db) {
        console.error("Firebase DB pa pase nan initAdminEchanj!");
        return;
    }

    console.log("Sèvis Admin Echanj demare...");

    // 1. Chaje paramèt yo (Frè, Nimewo, Switch)
    loadEchanjSettings(db);

    // 2. Koute epi afiche demann yo an tan reyèl
    listenToEchanjOrders(db);

    // 3. Bouton Sove Paramèt yo
    const btnSave = document.getElementById('btn-save-echanj-settings');
    if (btnSave) {
        btnSave.onclick = async (e) => {
            e.preventDefault();
            await saveEchanjSettings(db, btnSave);
        };
    }

    // 4. Delegation sou Tablo a pou Valide / Refize
    setupTableActions(db);
}

// ------------------------------------------------------------
// 1. CHAJE PARAMÈT YO
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
// 2. SOVE PARAMÈT YO (AK ANIMASYON AK KORÈKSYON VIRGUL/PWEN)
// ------------------------------------------------------------
async function saveEchanjSettings(db, btnElement) {
    const feeInput = document.getElementById('admin-system-fee');
    const switchInput = document.getElementById('admin-exchange-switch');
    const digicelInput = document.getElementById('admin-digicel-num');
    const natcomInput = document.getElementById('admin-natcom-num');

    // Ranplase virgul (,) pa pwen (.) pou evite erè NaN
    let rawFee = feeInput ? feeInput.value.replace(',', '.') : "16.5";
    const feeValue = parseFloat(rawFee) || 16.5;

    const exchangeActive = switchInput ? switchInput.checked : true;
    const digicelNum = digicelInput ? digicelInput.value.trim() : "50947111123";
    const natcomNum = natcomInput ? natcomInput.value.trim() : "32160708";

    // Efè vizyèl sou bouton an lè w klike l
    const originalText = btnElement.innerHTML;
    btnElement.disabled = true;
    btnElement.innerHTML = `<i class="fa-solid fa-spinner fa-spin"></i> Ap anrejistre...`;

    try {
        const updates = {};
        updates['settings/systemFee'] = feeValue;
        updates['settings/exchangeActive'] = exchangeActive;
        updates['settings/digicelNumber'] = digicelNum;
        updates['settings/natcomNumber'] = natcomNum;

        await update(ref(db), updates);

        // Mizajou sou input la pou montre fòma pwen an kòrèkteman
        if (feeInput) feeInput.value = feeValue;

        btnElement.style.background = "#22c55e";
        btnElement.innerHTML = `<i class="fa-solid fa-check"></i> Anrejistre ak Siksè!`;

        setTimeout(() => {
            btnElement.disabled = false;
            btnElement.style.background = "";
            btnElement.innerHTML = originalText;
        }, 2000);

    } catch (error) {
        console.error("Erè Sove Settings:", error);
        alert("❌ Erè nan sovgad: " + error.message);
        btnElement.disabled = false;
        btnElement.innerHTML = originalText;
    }
}

// ------------------------------------------------------------
// 3. RÂLE AK AFICHE DEMANN ECHANJ YO AN TAN REYÈL
// ------------------------------------------------------------
function listenToEchanjOrders(db) {
    const tableBody = document.getElementById('admin-echanj-table-body');
    if (!tableBody) return;

    // Nou koute 'transactions' POU CHÈCHE ECHANJ YO
    onValue(ref(db, 'transactions'), (snapshot) => {
        tableBody.innerHTML = '';

        if (!snapshot.exists()) {
            // Si pa gen nimewo nan 'transactions', nou ka gade nan 'admin_orders'
            checkAdminOrdersFallback(db, tableBody);
            return;
        }

        const orders = snapshot.val();
        let hasEchanj = false;

        const sortedKeys = Object.keys(orders).sort((a, b) => (orders[b].timestamp || 0) - (orders[a].timestamp || 0));

        sortedKeys.forEach(key => {
            const item = orders[key];

            // Tcheke si se yon operasyon echanj
            const isEchanj = item.type === "Echanj" || 
                             item.rezo || 
                             (item.description && item.description.toLowerCase().includes("echanj")) ||
                             item.amount_sent || 
                             item.minit;

            if (isEchanj) {
                hasEchanj = true;
                appendRowToTable(tableBody, key, item);
            }
        });

        if (!hasEchanj) {
            checkAdminOrdersFallback(db, tableBody);
        }
    });
}

// Si transactions pa genyen, tcheke 'admin_orders'
function checkAdminOrdersFallback(db, tableBody) {
    get(ref(db, 'admin_orders')).then((snapshot) => {
        if (!snapshot.exists()) {
            tableBody.innerHTML = `<tr><td colspan="8" style="text-align:center; padding:20px; color:#94a3b8;">Pa gen okenn demann echanj pou kounye a.</td></tr>`;
            return;
        }

        tableBody.innerHTML = '';
        const orders = snapshot.val();
        let hasEchanj = false;

        const sortedKeys = Object.keys(orders).sort((a, b) => (orders[b].timestamp || 0) - (orders[a].timestamp || 0));

        sortedKeys.forEach(key => {
            const item = orders[key];
            if (item.type === "Echanj" || item.rezo || item.amount_sent) {
                hasEchanj = true;
                appendRowToTable(tableBody, key, item);
            }
        });

        if (!hasEchanj) {
            tableBody.innerHTML = `<tr><td colspan="8" style="text-align:center; padding:20px; color:#94a3b8;">Pa gen okenn demann echanj pou kounye a.</td></tr>`;
        }
    });
}

// Fonksyon pou kreye chak liy nan tablo a
function appendRowToTable(tableBody, key, item) {
    const tr = document.createElement('tr');

    let statusBadge = `<span style="color: #f59e0b; font-weight: bold; background: rgba(245, 158, 11, 0.1); padding: 4px 8px; border-radius: 4px;">En attente</span>`;
    if (item.status === "Validé" || item.status === "Approuvé") {
        statusBadge = `<span style="color: #22c55e; font-weight: bold; background: rgba(34, 197, 94, 0.1); padding: 4px 8px; border-radius: 4px;">Validé</span>`;
    } else if (item.status === "Refusé" || item.status === "Annulé") {
        statusBadge = `<span style="color: #ef4444; font-weight: bold; background: rgba(239, 68, 68, 0.1); padding: 4px 8px; border-radius: 4px;">Refusé</span>`;
    }

    const dateStr = item.timestamp ? new Date(item.timestamp).toLocaleString('fr-FR') : '---';
    const netHTG = item.htg_to_receive || item.net_amount || item.amount_received || 0;
    const minitVoye = item.amount_sent || item.minit || item.amount || 0;
    const feePercent = item.applied_fee_percent || item.fee_percent || 16.5;

    tr.innerHTML = `
        <td style="padding:12px;"><b>${key.substring(0, 8)}</b><br><small style="color: #94a3b8;">${dateStr}</small></td>
        <td style="padding:12px;"><b>${item.fullname || item.user_name || 'Kliyan'}</b><br><small style="color: #38bdf8;">${item.phone || item.user_phone || ''}</small></td>
        <td style="padding:12px;"><b style="text-transform: uppercase; color: #f59e0b;">${item.rezo || 'Digicel/Natcom'}</b></td>
        <td style="padding:12px;"><b>${minitVoye} HTG</b></td>
        <td style="padding:12px;">${feePercent}%</td>
        <td style="padding:12px;"><b style="color: #22c55e; font-size: 1.05em;">${netHTG} HTG</b></td>
        <td style="padding:12px;">${statusBadge}</td>
        <td style="padding:12px;">
            ${(!item.status || item.status === "En attente") ? `
                <button class="btn-approve-order" data-id="${key}" data-uid="${item.uid || ''}" data-amount="${netHTG}" style="background: #16a34a; color: white; border: none; padding: 6px 12px; border-radius: 6px; cursor: pointer; margin-right: 5px; font-weight: bold;">
                    <i class="fa-solid fa-check"></i> Valide
                </button>
                <button class="btn-cancel-order" data-id="${key}" data-uid="${item.uid || ''}" style="background: #dc2626; color: white; border: none; padding: 6px 12px; border-radius: 6px; cursor: pointer; font-weight: bold;">
                    <i class="fa-solid fa-xmark"></i> Refize
                </button>
            ` : `<small style="color: #64748b; font-weight: bold;">Pwofese</small>`}
        </td>
    `;
    tableBody.appendChild(tr);
}

// ------------------------------------------------------------
// 4. AKSYON VALIDE AK REFIZE
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

        // Ajoute kòb la sou solde kont kliyan an nan Firebase
        if (uid) {
            const userRef = ref(db, `users/${uid}`);
            const userSnap = await get(userRef);
            if (userSnap.exists()) {
                const currentBalance = parseFloat(userSnap.val().balance || 0);
                const newBalance = currentBalance + montanPouAjoute;
                await update(userRef, { balance: newBalance });
            }
        }

        alert("✅ Demann echanj la VALIDÉ ak siksè! Solde kliyan an monte.");
    } catch (err) {
        console.error("Erè Validasyon:", err);
        alert("❌ Erè pandan validasyon an: " + err.message);
    }
}

async function handleRefuseEchanj(db, transID, uid) {
    if (!confirm("Èske ou sèten ou vle REFIZE demann echanj sa a?")) return;

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
               
