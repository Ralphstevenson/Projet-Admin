/* ============================================================
   ADMIN ECHANJ MODULE - ECHANJ PLUS V4.6 (REALTIME)
   ============================================================ */
import { db } from './script.js';
import { ref, get, update, onValue } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-database.js";

// 1. KOUTE AK SHARJE PARAMÈT YO NAN FIREBASE
function initAdminEchanjSettings() {
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

// 2. ANREJISTRE PARAMÈT YO (BOUTON ANREJISTRE)
const btnSave = document.getElementById('btn-save-echanj-settings');
if (btnSave) {
    btnSave.addEventListener('click', async () => {
        const feeValue = parseFloat(document.getElementById('admin-system-fee').value);
        const exchangeActive = document.getElementById('admin-exchange-switch').checked;
        const digicelNum = document.getElementById('admin-digicel-num').value.trim();
        const natcomNum = document.getElementById('admin-natcom-num').value.trim();

        if (isNaN(feeValue)) {
            return alert("⚠️ Tanpri antre yon pousantaj frè ki valab.");
        }

        try {
            await update(ref(db, 'settings'), {
                systemFee: feeValue,
                exchangeActive: exchangeActive,
                digicelNumber: digicelNum,
                natcomNumber: natcomNum
            });
            alert("✅ Konfigirasyon echanj yo anrejistre ak siksè!");
        } catch (error) {
            console.error("Erè nan anrejistreman:", error);
            alert("❌ Pwoblèm nan anrejistre done yo nan Firebase.");
        }
    });
}

// 3. KOUTE DEMANN ECHANJ YO AN TAN REYÈL
function loadAdminEchanjOrders() {
    const tableBody = document.getElementById('admin-echanj-table-body');
    if (!tableBody) return;

    onValue(ref(db, 'admin_orders'), (snapshot) => {
        tableBody.innerHTML = '';

        if (!snapshot.exists()) {
            tableBody.innerHTML = `<tr><td colspan="8" class="text-center-loading">Pa gen okenn demann echanj pou kounye a.</td></tr>`;
            return;
        }

        const orders = snapshot.val();
        let hasEchanj = false;

        // Triye demann yo soti nan pi resan pou rive nan pi ansyen
        const sortedKeys = Object.keys(orders).sort((a, b) => (orders[b].timestamp || 0) - (orders[a].timestamp || 0));

        sortedKeys.forEach(key => {
            const item = orders[key];

            if (item.type === "Echanj") {
                hasEchanj = true;
                const tr = document.createElement('tr');

                // Statut Badge
                let statusBadge = `<span style="color: #f59e0b; font-weight: bold;">En attente</span>`;
                if (item.status === "Validé" || item.status === "Approuvé") {
                    statusBadge = `<span style="color: #22c55e; font-weight: bold;">Validé</span>`;
                } else if (item.status === "Annulé" || item.status === "Echoué") {
                    statusBadge = `<span style="color: #ef4444; font-weight: bold;">Annulé</span>`;
                }

                // Format Dat
                const dateStr = item.timestamp ? new Date(item.timestamp).toLocaleString('fr-FR') : '---';

                tr.innerHTML = `
                    <td><b>${item.transID || key}</b><br><small style="color: #94a3b8;">${dateStr}</small></td>
                    <td><b>${item.fullname || 'Kliyan'}</b><br><small style="color: #38bdf8;">${item.arsID || ''}</small></td>
                    <td><b style="text-transform: uppercase;">${item.rezo || '---'}</b></td>
                    <td>${item.amount_sent || 0} HTG</td>
                    <td>${item.applied_fee_percent || 16.5}% (${item.fee_amount || 0} HTG)</td>
                    <td><b style="color: #22c55e;">${item.htg_to_receive || 0} HTG</b></td>
                    <td>${statusBadge}</td>
                    <td>
                        ${item.status === "En attente" ? `
                            <button class="btn-approve-order" data-id="${key}" data-uid="${item.uid}" data-amount="${item.htg_to_receive}" style="background: #16a34a; color: white; border: none; padding: 6px 12px; border-radius: 6px; cursor: pointer; margin-right: 5px;">
                                <i class="fa-solid fa-check"></i>
                            </button>
                            <button class="btn-cancel-order" data-id="${key}" data-uid="${item.uid}" style="background: #dc2626; color: white; border: none; padding: 6px 12px; border-radius: 6px; cursor: pointer;">
                                <i class="fa-solid fa-xmark"></i>
                            </button>
                        ` : '<small style="color: #64748b;">Traitée</small>'}
                    </td>
                `;
                tableBody.appendChild(tr);
            }
        });

        if (!hasEchanj) {
            tableBody.innerHTML = `<tr><td colspan="8" class="text-center-loading">Pa gen okenn demann echanj pou kounye a.</td></tr>`;
        }

        attachOrderActionEvents();
    });
}

// 4. VALIDE OSWA ANILE DEMANN
function attachOrderActionEvents() {
    // Bouton Valide
    document.querySelectorAll('.btn-approve-order').forEach(btn => {
        btn.onclick = async () => {
            const transID = btn.getAttribute('data-id');
            const uid = btn.getAttribute('data-uid');
            const montanPouAjoite = parseFloat(btn.getAttribute('data-amount'));

            if (!confirm(`Èske ou sèten ou vle valide echanj sa a epi ajoute ${montanPouAjoite} HTG sou balans kliyan an?`)) return;

            try {
                await update(ref(db, `admin_orders/${transID}`), { status: "Validé" });
                await update(ref(db, `transactions/${transID}`), { status: "Validé" });

                const userSnap = await get(ref(db, `users/${uid}`));
                if (userSnap.exists()) {
                    const currentBalance = parseFloat(userSnap.val().balance || 0);
                    const newBalance = currentBalance + montanPouAjoite;
                    await update(ref(db, `users/${uid}`), { balance: newBalance });
                }

                alert("✅ Echanj valide ak siksè! Balans kliyan an ajourne.");
            } catch (err) {
                console.error("Erè nan validasyon:", err);
                alert("❌ Erè pandan validasyon an.");
            }
        };
    });

    // Bouton Anile
    document.querySelectorAll('.btn-cancel-order').forEach(btn => {
        btn.onclick = async () => {
            const transID = btn.getAttribute('data-id');

            if (!confirm("Èske ou sèten ou vle anile demann echanj sa a?")) return;

            try {
                await update(ref(db, `admin_orders/${transID}`), { status: "Annulé" });
                await update(ref(db, `transactions/${transID}`), { status: "Annulé" });
                alert("🚫 Demann echanj la anile.");
            } catch (err) {
                console.error("Erè nan anilasyon:", err);
                alert("❌ Erè pandan anilasyon an.");
            }
        };
    });
}

// CHAJEMAN LÈ PAJ LA LOUVRI
document.addEventListener('DOMContentLoaded', () => {
    initAdminEchanjSettings();
    loadAdminEchanjOrders();
});
