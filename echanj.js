// ============================================================
// ECHANJ PLUS - ADMIN ECHANJ LOGIC (admin-echanj.js)
// ============================================================

import { ref, onValue, update, runTransaction } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-database.js";

/**
 * Inisyalize seksyon Echanj la depi admin.js fin valide koneksyon an
 * @param {Database} db - Instans Firebase Realtime Database la
 */
export function initAdminEchanj(db) {
    console.log("Seksyon Echanj lan aktive an sekirite!");

    const transRef = ref(db, 'transactions');
    const listeEchanjDiv = document.getElementById('lis-echanj-container');

    if (!listeEchanjDiv) {
        console.error("Erè: Eleman 'lis-echanj-container' pa egziste nan HTML la.");
        return;
    }

    // Koute tranzaksyon yo depi Firebase Auth fin valide
    onValue(transRef, (snapshot) => {
        const data = snapshot.val();
        listeEchanjDiv.innerHTML = ""; // Efase loading lan oswa ansyen done yo

        if (!data) {
            listeEchanjDiv.innerHTML = "<p class='loading'>Pa gen okenn tranzaksyon nan sistèm nan.</p>";
            return;
        }

        let genEchanj = false;

        for (let id in data) {
            const t = data[id];

            // FILTRE STRIKT: Nou afiche SÈLMAN si type la se egzakteman "echanj"
            if (t.type === "echanj") {
                genEchanj = true;
                
                let boutonsAksyon = "";
                // Bouton yo ap parèt sèlman si tranzaksyon an nan status 'pending'
                if (t.status === "pending") {
                    boutonsAksyon = `
                        <div class="aksyon-buttons">
                            <button class="btn-valide" data-id="${id}" data-uid="${t.uid}" data-receive="${t.to_receive}">Validé</button>
                            <button class="btn-anile" data-id="${id}">Anile</button>
                        </div>
                    `;
                } else {
                    boutonsAksyon = `<p><strong>Aksyon:</strong> Pwosesis fini (<span class="status-${t.status}">${t.status}</span>)</p>`;
                }

                // HTML Kat tranzaksyon an ak tout enfòmasyon yo dapre database ou a
                listeEchanjDiv.innerHTML += `
                    <div class="echanj-card">
                        <p><strong>ID Tranzaksyon:</strong> ${id}</p>
                        <p><strong>UID Kliyan:</strong> ${t.uid}</p>
                        <p><strong>Rezo kote kòb soti:</strong> ${t.rezo ? t.rezo.toUpperCase() : 'N/A'}</p>
                        <p><strong>Montan Voye (Amount):</strong> ${t.amount}</p>
                        <p><strong>Montan pou l Resevwa (To Receive):</strong> ${t.to_receive}</p>
                        <p><strong>Stati:</strong> <span class="status-${t.status}">${t.status}</span></p>
                        ${boutonsAksyon}
                    </div>
                `;
            }
        }

        if (!genEchanj) {
            listeEchanjDiv.innerHTML = "<p class='loading'>Pa gen okenn tranzaksyon ki gen tip 'echanj' pou kounye a.</p>";
            return;
        }

        // Ajoute Koutè sou bouton yo dinamikman apre yo fin desine nan HTML la
        ekouteBoutonAksyon(db);
    });
}

/**
 * Lojik pou jere klik sou bouton Validé ak Anile yo
 */
function ekouteBoutonAksyon(db) {
    // Bouton Validé
    document.querySelectorAll('.btn-valide').forEach(btn => {
        btn.addEventListener('click', function() {
            const transId = this.getAttribute('data-id');
            const clientUid = this.getAttribute('data-uid');
            const montanPoulResevwa = parseFloat(this.getAttribute('data-receive'));

            if (confirm(`Èske ou vle valide tranzaksyon ${transId} lan epi kredite kont kliyan an?`)) {
                this.disabled = true;
                
                const updates = {};
                updates[`/transactions/${transId}/status`] = "validé";

                // Chemen balans lan egzakteman jan screenshot la montre l: users/uid/balance
                const clientBalanceRef = ref(db, `users/${clientUid}/balance`);
                
                // Ogmante kont kliyan an otomatikman ak runTransaction pou evite konfli
                runTransaction(clientBalanceRef, (currentBalance) => {
                    return (currentBalance || 0) + montanPoulResevwa;
                })
                .then(() => {
                    // Depi kont lan kredite, nou chanje status tranzaksyon an an validé
                    return update(ref(db), updates);
                })
                .then(() => {
                    alert("Siksè! Tranzaksyon validé, kont kliyan an kredite.");
                })
                .catch((error) => {
                    console.error("Erè nan validation:", error);
                    alert("Gen yon erè ki pase pandan n ap kredite kont kliyan an.");
                    this.disabled = false;
                });
            }
        });
    });

    // Bouton Anile
    document.querySelectorAll('.btn-anile').forEach(btn => {
        btn.addEventListener('click', function() {
            const transId = this.getAttribute('data-id');

            if (confirm(`Èske ou vle anile tranzaksyon ${transId} lan?`)) {
                this.disabled = true;
                
                const updates = {};
                updates[`/transactions/${transId}/status`] = "anile";

                update(ref(db), updates)
                .then(() => {
                    alert("Tranzaksyon anile! Pa gen okenn kòb ki transfere.");
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
