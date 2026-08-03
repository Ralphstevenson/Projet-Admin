/* ============================================================
   ADMIN ECHANJ PLUS V4.6 - SCRIPT PRENSIPAL AK GÈSTYON ECHANJ
   ============================================================ */

import { db } from './script.js';
import { ref, get, update, onValue } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-database.js";

// ------------------------------------------------------------
// 1. GÈSTYON NAVIGASYON SOU MENI ANBA A (TAB SWITCHING)
// ------------------------------------------------------------
document.addEventListener('DOMContentLoaded', () => {
    const navButtons = document.querySelectorAll('.bottom-nav .nav-item');
    const sections = document.querySelectorAll('.admin-main .admin-section');

    navButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            const targetId = btn.getAttribute('data-target');

            navButtons.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');

            sections.forEach(sec => sec.classList.add('hidden'));

            const targetSection = document.getElementById(targetId);
            if (targetSection) {
                targetSection.classList.remove('hidden');
            }
        });
    });

    // Inisyalize chajeman done yo lè paj la prè
    initAdminEchanjSettings();
    loadAdminEchanjOrders();
});

// ------------------------------------------------------------
// 2. CHAJEMAN AK KOUTE PARAMÈT SYSTÈM YO DEPI FIREBASE
// ------------------------------------------------------------
function initAdminEchanjSettings() {
    const feeInput = document.getElementById('admin-system-fee');
    const switchInput = document.getElementById('admin-exchange-switch');
    const digicelInput = document.getElementById('admin-digicel-num');
    const natcomInput = document.getElementById('admin-natcom-num');

    // N ap koute node settings lan
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
// 3. ANREJISTRE PARAMÈT ECHANJ YO (MODIFIKASYON AP MACHE)
// ------------------------------------------------------------
const btnSaveEchanj = document.getElementById('btn-save-echanj-settings');
if (btnSaveEchanj) {
    btnSaveEchanj.addEventListener('click', async (e) => {
        e.preventDefault();

        const feeValue = parseFloat(document.getElementById('admin-system-fee').value);
        const exchangeActive = document.getElementById('admin-exchange-switch').checked;
        const digicelNum = document.getElementById('admin-digicel-num').value.trim();
        const natcomNum = document.getElementById('admin-natcom-num').value.trim();

        if (isNaN(feeValue)) {
            return alert("⚠️ Tanpri antre yon pousantaj frè ki valab.");
        }

        try {
            // Sovgard sou 2 kote pou asire l antre vre pou APK kliyan yo
            const updates = {};
            updates['settings/systemFee'] = feeValue;
            updates['settings/exchangeActive'] = exchangeActive;
            updates['settings/digicelNumber'] = digicelNum;
            updates['settings/natcomNumber'] = natcomNum;

            updates['exchange_settings/systemFee'] = feeValue;
            updates['exchange_settings/exchangeActive'] = exchangeActive;
            updates['exchange_settings/digicelNumber'] = digicelNum;
            updates['exchange_settings/natcomNumber'] = natcomNum;

            await update(ref(db), updates);
            alert("✅ Mizajou yo anrejistre ak siksè nan Firebase!");
        } catch (error) {
            console.error("Erè nan anrejistreman:", error);
            alert("❌ Pwoblèm nan anrejistre done yo: " + error.message);
        }
    });
}

// ------------------------------------------------------------
// 4. CHAJEMAN AN TAN REYÈL TABLEAU DEMANN ECHANJ YO
// ------------------------------------------------------------
function loadAdminEchanjOrders() {
    const tableBody = document.getElementById('admin-echanj-table-body');
    if (!tableBody) return;

    // N ap koute sou node `transactions` (kote anpil APK voye demann)
    onValue(ref(db, 'transactions'), (snapshot) => {
        tableBody.innerHTML = '';

        if (!snapshot.exists()) {
            tableBody.innerHTML = `<tr><td colspan="8" class="text-center-loading">Pa gen okenn demann echanj pou kounye a.</td></tr>`;
            return;
        }

        const orders = snapshot.val();
        let hasEchanj = false;

        const sortedKeys = Object.keys(orders).sort((a, b) => (orders[b].timestamp || 0) - (orders[a].timestamp || 0));

        sortedKeys.forEach(key => {
            const item = orders[key];

            // Filtre tout sa ki gen rapò ak echanj (se fason APK yo voye l)
            const isEchanj = (item.type && item.type.toLowerCase().includes('echanj')) || 
                             (item.service && item.service.toLowerCase().includes('echanj')) || 
                             item.rezo || item.amount_sent;

            if (isEchanj) {
                hasEchanj = true;
                const tr = document.createElement('tr');

                let statusBadge = `<span style="color: #f59e0b; font-weight: bold;">En attente</span>`;
                if (item.status === "Validé" || item.status === "Approuvé") {
                    statusBadge = `<span style="color: #22c55e; font-weight: bold;">Validé</span>`;
                } else if (item.status === "Annulé" || item.status === "Echoué") {
                    statusBadge = `<span style="color: #ef4444; font-weight: bold;">Annulé</span>`;
                }

                const dateStr = item.timestamp ? new Date(item.timestamp).toLocaleString('fr-FR') : '---';

                tr.innerHTML = `
                    <td><b>${item.transID || key}</b><br><small style="color: #94a3b8;">${dateStr}</small></td>
                    <td><b>${item.fullname || item.userEmail || 'Kliyan'}</b><br><small style="color: #38bdf8;">${item.arsID || item.phone || ''}</small></td>
                    <td><b style="text-transform: uppercase; color: #f59e0b;">${item.rezo || 'Digicel/Natcom'}</b></td>
                    <td>${item.amount_sent || item.amount || 0} HTG</td>
                    <td>${item.applied_fee_percent || 16.5}%</td>
                    <td><b style="color: #22c55e;">${item.htg_to_receive || item.net_amount || 0} HTG</b></td>
                    <td>${statusBadge}</td>
                    <td>
                        ${(!item.status || item.status === "En attente" || item.status === "pending") ? `
                            <button class="btn-approve-order" data-id="${key}" data-uid="${item.uid}" data-amount="${item.htg_to_receive || item.net_amount || 0}" style="background: #16a34a; color: white; border: none; padding: 6px 12px; border-radius: 6px; cursor: pointer; margin-right: 5px;">
                                <i class="fa-solid fa-check"></i> Approver
                            </button>
                            <button class="btn-cancel-order" data-id="${key}" data-uid="${item.uid}" style="background: #dc2626; color: white; border: none; padding: 6px 12px; border-radius: 6px; cursor: pointer;">
                                <i class="fa-solid fa-xmark"></i> Annuler
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

// ------------------------------------------------------------
// 5. BOUTON AKSYON POU VALIDE (APPROUVER) AK ANILE (ANNULER)
// ------------------------------------------------------------
function attachOrderActionEvents() {
    // Bouton Valide / Approver
    document.querySelectorAll('.btn-approve-order').forEach(btn => {
        btn.onclick = async () => {
            const transID = btn.getAttribute('data-id');
            const uid = btn.getAttribute('data-uid');
            const montanPouAjoite = parseFloat(btn.getAttribute('data-amount'));

            if (!confirm(`Èske ou sèten ou vle aprouve echanj sa a epi ajoute ${montanPouAjoite} HTG sou balans kliyan an?`)) return;

            try {
                // Update nan Firebase
                const updates = {};
                updates[`transactions/${transID}/status`] = "Validé";
                updates[`admin_orders/${transID}/status`] = "Validé";

                await update(ref(db), updates);

                // Ajoute kob la sou kont kliyan an si UID la egziste
                if (uid) {
                    const userSnap = await get(ref(db, `users/${uid}`));
                    if (userSnap.exists()) {
                        const currentBalance = parseFloat(userSnap.val().balance || 0);
                        const newBalance = currentBalance + montanPouAjoite;
                        await update(ref(db, `users/${uid}`), { balance: newBalance });
                    }
                }

                alert("✅ Demann Echanj sa a aprouve ak siksè!");
            } catch (err) {
                console.error("Erè nan validasyon:", err);
                alert("❌ Erè pandan apwobasyon an: " + err.message);
            }
        };
    });

    // Bouton Anile
    document.querySelectorAll('.btn-cancel-order').forEach(btn => {
        btn.onclick = async () => {
            const transID = btn.getAttribute('data-id');

            if (!confirm("Èske ou sèten ou vle anile demann echanj sa a?")) return;

            try {
                const updates = {};
                updates[`transactions/${transID}/status`] = "Annulé";
                updates[`admin_orders/${transID}/status`] = "Annulé";

                await update(ref(db), updates);
                alert("🚫 Demann echanj la anile.");
            } catch (err) {
                console.error("Erè nan anilasyon:", err);
                alert("❌ Erè pandan anilasyon an.");
            }
        };
    });
}
