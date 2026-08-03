// ============================================================
// ECHANJ PLUS - ADMIN AKEY LOGIC (akey.js)
// ============================================================

import { ref, onValue, set, update } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-database.js";

export function initAkeySection(db) {
    listenToSettings(db);
    listenToStats(db);

    const settingsForm = document.getElementById('system-settings-form');
    if (settingsForm) {
        settingsForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            await saveSettings(db);
        });
    }
}

// 1. KOUTE AK ENTEGRE PARAMÈT YO (settings/)
function listenToSettings(db) {
    const settingsRef = ref(db, 'settings');
    
    onValue(settingsRef, (snapshot) => {
        if (snapshot.exists()) {
            const data = snapshot.val();
            
            const rateBuy = document.getElementById('set-rate-buy');
            const rateSell = document.getElementById('set-rate-sell');
            const systemFee = document.getElementById('set-system-fee');

            if (rateBuy && data.rateBuy !== undefined) rateBuy.value = data.rateBuy;
            if (rateSell && data.rateSell !== undefined) rateSell.value = data.rateSell;
            if (systemFee) systemFee.value = data.systemFee !== undefined ? data.systemFee : 16.5;

            const swEx = document.getElementById('switch-exchange');
            const swWd = document.getElementById('switch-withdraw');
            const swMt = document.getElementById('switch-maintenance');

            if (swEx) swEx.checked = !!data.exchangeActive;
            if (swWd) swWd.checked = !!data.withdrawActive;
            if (swMt) swMt.checked = !!data.maintenanceMode;
        }
    }, (error) => {
        console.error("Erè nan lekti settings:", error);
    });
}

// 2. ANREJISTRE PARAMÈT YO (SÈVI AK `set` POU KREYE NŒUD LA SI L PAT EGZISTE)
async function saveSettings(db) {
    const btnSave = document.getElementById('btn-save-settings');
    const originalBtnContent = btnSave ? btnSave.innerHTML : '';

    try {
        if (btnSave) {
            btnSave.disabled = true;
            btnSave.innerHTML = `<i class="fas fa-spinner fa-spin"></i> N ap anrejistre...`;
        }

        const rateBuy = parseFloat(document.getElementById('set-rate-buy').value) || 0;
        const rateSell = parseFloat(document.getElementById('set-rate-sell').value) || 0;
        const systemFee = parseFloat(document.getElementById('set-system-fee').value) || 16.5;
        
        const exchangeActive = document.getElementById('switch-exchange').checked;
        const withdrawActive = document.getElementById('switch-withdraw').checked;
        const maintenanceMode = document.getElementById('switch-maintenance').checked;

        // Nou itilize `set` sou 'settings' pou kreye l menm si li potko janm egziste
        await set(ref(db, 'settings'), {
            rateBuy: rateBuy,
            rateSell: rateSell,
            systemFee: systemFee,
            exchangeActive: exchangeActive,
            withdrawActive: withdrawActive,
            maintenanceMode: maintenanceMode,
            lastUpdated: Date.now()
        });

        alert("✅ Paramèt ak To yo anrejistre ak siksè!");
    } catch (error) {
        alert("❌ Pwoblèm nan anrejistreman: " + error.message);
    } finally {
        if (btnSave) {
            btnSave.disabled = false;
            btnSave.innerHTML = originalBtnContent;
        }
    }
}

// 3. RALE ESTATISTIK YO TAN REYÈL DÈSKE ITILIZATÈ FÈ YON AKSYON
function listenToStats(db) {
    const totalUsersElem = document.getElementById('stat-total-users');
    const totalExchangesElem = document.getElementById('stat-total-exchanges');
    const totalProfitElem = document.getElementById('stat-total-profit');
    const totalWithdrawalsElem = document.getElementById('stat-total-withdrawals');

    // A. Moun ki enskri yo
    onValue(ref(db, 'users'), (snap) => {
        if (snap.exists()) {
            const usersObj = snap.val();
            if (totalUsersElem) totalUsersElem.innerText = Object.keys(usersObj).length;
        } else {
            if (totalUsersElem) totalUsersElem.innerText = "0";
        }
    });

    // B. Total Echanj + Kalkil Beniﬁs 16.5% Sou Echanj Ranpli Yo
    onValue(ref(db, 'transactions'), (snap) => {
        if (snap.exists()) {
            const txData = snap.val();
            const txArray = Object.values(txData);

            if (totalExchangesElem) totalExchangesElem.innerText = txArray.length;

            let profit = 0;
            txArray.forEach(tx => {
                // Tcheke tout estati siksè ki ka nan baz de done a
                if (tx.status === 'success' || tx.status === 'completed' || tx.status === 'terfene') {
                    const amount = parseFloat(tx.amount) || parseFloat(tx.montant) || parseFloat(tx.htgAmount) || 0;
                    profit += (amount * 0.165);
                }
            });

            if (totalProfitElem) {
                totalProfitElem.innerText = profit.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + " HTG";
            }
        } else {
            if (totalExchangesElem) totalExchangesElem.innerText = "0";
            if (totalProfitElem) totalProfitElem.innerText = "0.00 HTG";
        }
    });

    // C. Total Retrè yo
    onValue(ref(db, 'withdrawals'), (snap) => {
        if (snap.exists()) {
            const wdData = snap.val();
            if (totalWithdrawalsElem) totalWithdrawalsElem.innerText = Object.keys(wdData).length;
        } else {
            if (totalWithdrawalsElem) totalWithdrawalsElem.innerText = "0";
        }
    });
}
