// ============================================================
// ECHANJ PLUS - ADMIN AKEY LOGIC (akey.js)
// ============================================================

import { ref, onValue, update } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-database.js";

export function initAkeySection(db) {
    listenToSettings(db);
    listenToStats(db);

    // Koute bouton soumèt form nan
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
            
            // Plase Done nan Input yo
            const rateBuy = document.getElementById('set-rate-buy');
            const rateSell = document.getElementById('set-rate-sell');
            const systemFee = document.getElementById('set-system-fee');

            if (rateBuy && data.rateBuy !== undefined) rateBuy.value = data.rateBuy;
            if (rateSell && data.rateSell !== undefined) rateSell.value = data.rateSell;
            if (systemFee) systemFee.value = data.systemFee !== undefined ? data.systemFee : 16.5;

            // Plase Switch On/Off yo
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

// 2. ANREJISTRE MIZAJOU PARAMÈT YO
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

        await update(ref(db, 'settings'), {
            rateBuy: rateBuy,
            rateSell: rateSell,
            systemFee: systemFee,
            exchangeActive: exchangeActive,
            withdrawActive: withdrawActive,
            maintenanceMode: maintenanceMode,
            lastUpdated: Date.now()
        });

        alert("✅ Paramèt yo anrejistre ak siksè!");
    } catch (error) {
        alert("❌ Pwoblèm nan anrejistreman: " + error.message);
    } finally {
        if (btnSave) {
            btnSave.disabled = false;
            btnSave.innerHTML = originalBtnContent;
        }
    }
}

// 3. RALE ESTATISTIK YO REALTIME NAN FIREBASE (users, transactions, withdrawals)
function listenToStats(db) {
    const totalUsersElem = document.getElementById('stat-total-users');
    const totalExchangesElem = document.getElementById('stat-total-exchanges');
    const totalProfitElem = document.getElementById('stat-total-profit');
    const totalWithdrawalsElem = document.getElementById('stat-total-withdrawals');

    // A. Total Moun Ki Enskri (users)
    onValue(ref(db, 'users'), (snap) => {
        if (snap.exists()) {
            const usersObj = snap.val();
            const total = Object.keys(usersObj).length;
            if (totalUsersElem) animateValue(totalUsersElem, total);
        } else {
            if (totalUsersElem) totalUsersElem.innerText = "0";
        }
    });

    // B. Total Echanj Ki Fèt + Benifi 16.5% (transactions)
    onValue(ref(db, 'transactions'), (snap) => {
        if (snap.exists()) {
            const txData = snap.val();
            const txArray = Object.values(txData);

            if (totalExchangesElem) animateValue(totalExchangesElem, txArray.length);

            // Kalkile 16.5% sou echanj ki ranpli ak siksè yo
            let profit = 0;
            txArray.forEach(tx => {
                if (tx.status === 'success' || tx.status === 'completed' || tx.status === 'terfene') {
                    const amount = parseFloat(tx.amount) || parseFloat(tx.montant) || 0;
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

    // C. Total Retrè Ki Fèt (withdrawals)
    onValue(ref(db, 'withdrawals'), (snap) => {
        if (snap.exists()) {
            const wdData = snap.val();
            const total = Object.keys(wdData).length;
            if (totalWithdrawalsElem) animateValue(totalWithdrawalsElem, total);
        } else {
            if (totalWithdrawalsElem) totalWithdrawalsElem.innerText = "0";
        }
    });
}

// TI ANIMASYON PWOFESYONÈL POU CHIF YO K AP MONTE
function animateValue(element, endVal) {
    let startVal = 0;
    const duration = 500;
    const stepTime = 20;
    const steps = duration / stepTime;
    const increment = (endVal - startVal) / steps;

    if (endVal === 0) {
        element.innerText = "0";
        return;
    }

    let current = startVal;
    const timer = setInterval(() => {
        current += increment;
        if (current >= endVal) {
            element.innerText = Math.round(endVal);
            clearInterval(timer);
        } else {
            element.innerText = Math.round(current);
        }
    }, stepTime);
                }
        
