// ============================================================
// LOJIK AKÈY (SETTINGS, STATISTIK, ON/OFF SWITCHES)
// ============================================================

function initAkeySection() {
    listenToSettings();
    listenToStats();

    // Soumèt fòm paramèt yo
    const settingsForm = document.getElementById('system-settings-form');
    if (settingsForm) {
        settingsForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            await saveSettings();
        });
    }
}

// 1. KOUTE AK ANREJISTRE PARAMÈT YO NAN BAZ DE DONE A (settings/)
function listenToSettings() {
    const settingsRef = ref(db, 'settings');
    onValue(settingsRef, (snapshot) => {
        if (snapshot.exists()) {
            const data = snapshot.val();
            
            // Konfigirasyon input yo
            if (data.rateBuy) document.getElementById('set-rate-buy').value = data.rateBuy;
            if (data.rateSell) document.getElementById('set-rate-sell').value = data.rateSell;
            document.getElementById('set-system-fee').value = data.systemFee !== undefined ? data.systemFee : 16.5;

            // Switches On/Off
            document.getElementById('switch-exchange').checked = data.exchangeActive || false;
            document.getElementById('switch-withdraw').checked = data.withdrawActive || false;
            document.getElementById('switch-maintenance').checked = data.maintenanceMode || false;
        }
    });
}

async function saveSettings() {
    const rateBuy = parseFloat(document.getElementById('set-rate-buy').value);
    const rateSell = parseFloat(document.getElementById('set-rate-sell').value);
    const systemFee = parseFloat(document.getElementById('set-system-fee').value);
    
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

// 2. KOUTE STATISTIK YO TAN REYÈL (users, transactions, withdrawals)
function listenToStats() {
    // Kontab Moun ki enskri yo
    onValue(ref(db, 'users'), (snap) => {
        document.getElementById('stat-total-users').innerText = snap.exists() ? Object.keys(snap.val()).length : 0;
    });

    // Kontab Echanj ak Retrè yo
    onValue(ref(db, 'transactions'), (snap) => {
        if (snap.exists()) {
            const data = snap.val();
            const totalExchanges = Object.keys(data).length;
            document.getElementById('stat-total-exchanges').innerText = totalExchanges;

            // Kalkile benifi total sou frè 16.5% la
            let totalProfit = 0;
            Object.values(data).forEach(tx => {
                if (tx.status === 'success' || tx.status === 'completed') {
                    // Kalkile frè 16.5% sou chak echanj ki reyalize
                    const feeAmount = (tx.amount || 0) * 0.165; 
                    totalProfit += feeAmount;
                }
            });
            document.getElementById('stat-total-profit').innerText = totalProfit.toFixed(2) + " HTG";
        } else {
            document.getElementById('stat-total-exchanges').innerText = "0";
            document.getElementById('stat-total-profit').innerText = "0 HTG";
        }
    });

    onValue(ref(db, 'withdrawals'), (snap) => {
        document.getElementById('stat-total-withdrawals').innerText = snap.exists() ? Object.keys(snap.val()).length : 0;
    });
}

// PA BLIYE RELE FONKSYON SA A NAN initAdminApp()
// function initAdminApp() {
//     initAkeySection();
// }
      
