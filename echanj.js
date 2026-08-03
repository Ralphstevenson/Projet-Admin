/* ============================================================
   JS ADMIN ECHANJ - ECHANJ PLUS V4.6 (CONTROL & APPROVAL)
   ============================================================ */
import { db } from './script.js';
import { ref, get, update, onValue } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-database.js";

// ==========================================
// 1. KOUTE AK SHARJE PARAMÈT SÈVIS ECHANJ
// ==========================================
export function initAdminEchanj() {
    initAdminEchanjSettings();
    loadAdminEchanjOrders();
}

function initAdminEchanjSettings() {
    const feeInput = document.getElementById('admin-system-fee');
    const switchInput = document.getElementById('admin-exchange-switch');
    const digicelInput = document.getElementById('admin-digicel-num');
    const natcomInput = document.getElementById('admin-natcom-num');

    // Chaje paramèt yo an tan reyèl
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

// ==========================================
// 2. SOVE MODIFIKASYON ADMIN (ON/OFF, FRÈ, NIMEWO)
// ==========================================
document.addEventListener('click', async (e) => {
    if (e.target && (e.target.id === 'btn-save-echanj-settings' || e.target.closest('#btn-save-echanj-settings'))) {
        e.preventDefault();

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
            alert(`✅ Paramèt Echanj anrejistre ak siksè!\nStatut Sèvis: ${exchangeActive ? 'ACTIF (ON)' : 'BLOKÉ (OFF)'}`);
        } catch (error) {
            console.error("Erè sovgad Admin:", error);
            alert("❌ Pwoblèm nan Firebase: " + error.message);
        }
    }
});

// ==========================================
// 3. CHAJEMAN AN TAN REYÈL TABLO TRANZAKSYON YO
// ==========================================
function loadAdminEchanjOrders() {
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

        const sortedKeys = Object.keys(orders).sort((a, b) => (orders[b].timestamp || 0) - (orders[a].timestamp || 0));

        sortedKeys.forEach(key => {
            const item = orders[key];

            // Filtre sèlman demann ki se echanj
            if (item.type === "Echanj" || item.rezo) {
                hasEchanj = true;
                const tr = document.createElement('tr');

                let statusBadge = `<span style="color: #f59e0b; font-weight: bold;">En attente</span>`;
                if (item.status === "Validé" || item.status === "Approuvé") {
                    statusBadge = `<span style="color: #22c55e; font-weight: bold;">Validé</span>`;
                } else if (item.status === "Refusé" || item.status === "Annulé") {
                    statusBadge = `<span style="color: #ef4444; font-weight: bold;">Refusé</span>`;
                }

                const dateStr = item.timestamp ? new Date(item.timestamp).toLocaleString('fr-FR') : '---';
                const netHTG = item.htg_to_receive || 0;

                tr.innerHTML = `
                    <td style="padding:12px;"><b>${key.substring(0, 10)}</b><br><small style="color: #94a3b8;">${dateStr}</small></td>
                    <td style="padding:12px;"><b>${item.fullname || 'Kliyan'}</b><br><small style="color: #38bdf8;">${item.phone || ''}</small></td>
                    <td style="padding:12px;"><b style="text-transform: uppercase; color: #f59e0b;">${item.rezo || '---'}</b></td>
                    <td style="padding:12px;">${item.amount_sent || 0} HTG</td>
                    <td style="padding:12px;">${item.applied_fee_percent || 16.5}%</td>
                    <td style="padding:12px;"><b style="color: #22c55e;">${netHTG} HTG</b></td>
                    <td style="padding:12px;">${statusBadge}</td>
                    <td style="padding:12px;">
                        ${(!item.status || item.status === "En attente") ? `
                            <button class="btn-approve-order" data-id="${key}" data-uid="${item.uid}" data-amount="${netHTG}" style="background: #16a34a; color: white; border: none; padding: 6px 12px; border-radius: 6px; cursor: pointer; margin-right: 5px;">
                                <i class="fa-solid fa-check"></i> Valide
                            </button>
                            <button class="btn-cancel-order" data-id="${key}" data-uid="${item.uid}" style="background: #dc2626; color: white; border: none; padding: 6px 12px; border-radius: 6px; cursor: pointer;">
                                <i class="fa-solid fa-xmark"></i> Refize
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

        attachOrderActionEvents();
    });
}

// ==========================================
// 4. AKSYON VALIDE AK REFIZE
// ==========================================
function attachOrderActionEvents() {
    // BOUTON VALIDE
    document.querySelectorAll('.btn-approve-order').forEach(btn => {
        btn.onclick = async () => {
            const transID = btn.getAttribute('data-id');
            const uid = btn.getAttribute('data-uid');
            const montanPouAjoute = parseFloat(btn.getAttribute('data-amount'));

            if (!confirm(`Valide echanj sa a epi ajoute ${montanPouAjoute} HTG sou kont kliyan an?`)) return;

            try {
                const updates = {};
                updates[`transactions/${transID}/status`] = "Validé";
                updates[`admin_orders/${transID}/status`] = "Validé";
                if (uid) {
                    updates[`users/${uid}/user_transactions/${transID}/status`] = "Validé";
                }

                await update(ref(db), updates);

                // Recharje ak Ogmante Balans Kliyan an
                if (uid) {
                    const userRef = ref(db, `users/${uid}`);
                    const userSnap = await get(userRef);
                    if (userSnap.exists()) {
                        const currentBalance = parseFloat(userSnap.val().balance || 0);
                        const newBalance = currentBalance + montanPouAjoute;
                        await update(userRef, { balance: newBalance });
                    }
                }

                alert("✅ Echanj Valide! Kòb la monte sou kont kliyan an ak siksè.");
            } catch (err) {
                console.error("Erè Validasyon:", err);
                alert("❌ Erè pandan validasyon an: " + err.message);
            }
        };
    });

    // BOUTON REFIZE
    document.querySelectorAll('.btn-cancel-order').forEach(btn => {
        btn.onclick = async () => {
            const transID = btn.getAttribute('data-id');
            const uid = btn.getAttribute('data-uid');

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
        };
    });
                   }
               
