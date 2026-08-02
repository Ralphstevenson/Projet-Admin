// ============================================================
// ECHANJ PLUS - ADMIN AKEY LOGIC (akey.js)
// ============================================================

import { ref, onValue, update } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-database.js";

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

// 1. KOUTE AK ANREJISTRE PARAMÈT YO NAN BAZ DE DONE A (settings/)
function listenToSettings(db) {
    const settingsRef = ref(db, 'settings');
    onValue(settingsRef, (snapshot) => {
        if (snapshot.exists()) {
            const data = snapshot.val();
            
            const rateBuyElem = document.getElementById('set-rate-buy');
            const rateSellElem = document.getElementById('set-rate-sell');
            const systemFeeElem = document.getElementById('set-system-fee');
            
            if (rateBuyElem && data.rateBuy !== undefined) rateBuyElem.value = data.rateBuy;
            if (rateSellElem && data.rateSell !== undefined) rateSellElem.value = data.rateSell;
            if (systemFeeElem) systemFeeElem.value = data.systemFee !== undefined ? data.systemFee : 16.5;

            const swEx = document.getElementById('switch-exchange');
            const swWd = document.getElementById('switch-withdraw');
            const swMt = document.getElementById('switch-maintenance');

            if (swEx) swEx.checked = data.exchangeActive || false;
            if (swWd) swWd.checked = data.withdrawActive || false;
            if (swMt) swMt.checked = data.maintenanceMode || false;
        }
    });
}

// 2. ANREJISTRE NOUVO PARAMÈT YO
async function saveSettings(db) {
    const rateBuy = parseFloat(document.getElementById('set-rate-buy').value) || 0;
    const rateSell = parseFloat(document.getElementById('set-rate-sell').value) || 0;
    const systemFee = parseFloat(document.getElementById('set-system-fee').value) || 16.5;
    
    const exchangeActive = document.getElementById('switch-exchange').checked;
    const withdrawActive = document.getElementById('switch-withdraw').checked;
    const maintenanceMode = document.getElementById('switch-maintenance').checked;

    try {
        await update(ref(db, 'settings'), {
            rateBuy: rateBuy,
            rateSell: rateSell,
            systemFee: systemFee,
            exchangeActive: exchangeActive,
            withdrawActive: withdrawActive,
            maintenanceMode: maintenanceMode,
            lastUpdated: Date.now()
        });
        alert("Paramèt yo anrejistre ak siksè nan Firebase!");
    } catch (error) {
        alert("Erè nan anrejistreman: " + error.message);
    }
}

// 3. KOUTE STATISTIK YO TAN REYÈL (users, transactions, withdrawals)
function listenToStats(db) {
    const totalUsersElem = document.getElementById('stat-total-users');
    const totalExchangesElem = document.getElementById('stat-total-exchanges');
    const totalProfitElem = document.getElementById('stat-total-profit');
    const totalWithdrawalsElem = document.getElementById('stat-total-withdrawals');

    // Moun ki enskri
    onValue(ref(db, 'users'), (snap) => {
        if (totalUsersElem) {
            totalUsersElem.innerText = snap.exists() ? Object.keys(snap.val()).length : 0;
        }
    });

    // Echanj ak Benifi 16.5%
    onValue(ref(db, 'transactions'), (snap) => {
        if (snap.exists()) {
            const data = snap.val();
            if (totalExchangesElem) totalExchangesElem.innerText = Object.keys(data).length;

            let totalProfit = 0;
            Object.values(data).forEach(tx => {
                if (tx.status === 'success' || tx.status === 'completed') {
                    const feeAmount = (tx.amount || 0) * 0.165; 
                    totalProfit += feeAmount;
                }
            });
            if (totalProfitElem) totalProfitElem.innerText = totalProfit.toFixed(2) + " HTG";
        } else {
            if (totalExchangesElem) totalExchangesElem.innerText = "0";
            if (totalProfitElem) totalProfitElem.innerText = "0 HTG";
        }
    });

    // Retrè
    onValue(ref(db, 'withdrawals'), (snap) => {
        if (totalWithdrawalsElem) {
            totalWithdrawalsElem.innerText = snap.exists() ? Object.keys(snap.val()).length : 0;
        }
    });
            }
