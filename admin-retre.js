// ============================================================
// ECHANJ PLUS - CSS RETRÈ AK JESYON KLIYAN (JS RETRÈ CORRIGÉ)
// ============================================================
import { ref, onValue, update, runTransaction } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-database.js";

let currentFilter = "all";
let allWithdrawalsData = {};
let allUsersData = {};
let targetRejectId = null;
let targetRejectData = null;
let selectedUserUid = null; 

// Sove estrikti tablo jeneral la pou lè nou bezwen retounen sou li
const originalTableHTML = `
    <div class="table-responsive">
        <table class="table table-hover align-middle mb-0 text-nowrap">
            <thead class="table-dark">
                <tr>
                    <th>Kliyan (ID)</th>
                    <th>Mètòd & Telefòn</th>
                    <th>Montan</th>
                    <th>Dat Kreyasyon</th>
                    <th>Statut</th>
                    <th class="text-center">Aksyon Admin</th>
                </tr>
            </thead>
            <tbody id="admin-withdrawal-list">
                <tr>
                    <td colspan="6" class="text-center text-muted p-4">Ap chaje demann retrè yo...</td>
                </tr>
            </tbody>
        </table>
    </div>
`;

export function initAdminRetre(db) {
    console.log("Modil Retrè lanse ak siksè!");
    
    const totalPendingBadge = document.getElementById("total-pending-badge");
    const userListContainer = document.getElementById("div-clients-list"); 
    
    const dbWithdrawalsRef = ref(db, "withdrawals");
    const dbUsersRef = ref(db, "users");

    // --------------------------------------------------------
    // 1. LISTENERS REALTIME (Koute Firebase)
    // --------------------------------------------------------
    onValue(dbWithdrawalsRef, (withdrawalSnapshot) => {
        allWithdrawalsData = withdrawalSnapshot.exists() ? withdrawalSnapshot.val() : {};
        calculateUserPendingAlerts();
        refreshUI();
    });

    onValue(dbUsersRef, (userSnapshot) => {
        allUsersData = userSnapshot.exists() ? userSnapshot.val() : {};
        calculateUserPendingAlerts();
        renderUsersSidebar(userListContainer);
    });

    function refreshUI() {
        const withdrawalListElem = document.getElementById("admin-withdrawal-list");
        if (withdrawalListElem && !selectedUserUid) {
            renderWithdrawalsTable(withdrawalListElem, totalPendingBadge);
        } else if (selectedUserUid) {
            renderUserHistory(selectedUserUid);
        }
        renderUsersSidebar(userListContainer);
    }

    // --------------------------------------------------------
    // 2. SISTÈM RECHÈCH KLIYAN NAN SIDEBAR A (KORÈK)
    // --------------------------------------------------------
    const userSearchInput = document.getElementById("user-search-input");
    if (userSearchInput) {
        userSearchInput.addEventListener("input", (e) => {
            const searchValue = e.target.value.trim().toLowerCase();
            
            if (searchValue === "") {
                renderUsersSidebar(userListContainer);
                return;
            }

            const filteredUsers = {};
            Object.keys(allUsersData).forEach(uid => {
                const u = allUsersData[uid] || {};
                const name = (u.fullname || "").toLowerCase(); // Firebase 'fullname'
                const phone = (u.phone || "").toLowerCase();
                
                if (name.includes(searchValue) || phone.includes(searchValue) || uid.toLowerCase().includes(searchValue)) {
                    filteredUsers[uid] = u;
                }
            });
            renderUsersSidebar(userListContainer, filteredUsers);
        });
    }

    // --------------------------------------------------------
    // 3. RECHÈCH TRANZAKSYON PA UID OYWA KLE NAN FIREBASE
    // --------------------------------------------------------
    const txSearchInput = document.getElementById("tx-search-input");
    const btnSearchTx = document.getElementById("btn-search-tx");
    
    if (btnSearchTx && txSearchInput) {
        btnSearchTx.addEventListener("click", () => {
            const term = txSearchInput.value.trim().toLowerCase();
            resetToGeneralTable(); // Fòse tablo a reset anvan rechèch la afiche
            
            const withdrawalListElem = document.getElementById("admin-withdrawal-list");
            if (!term) {
                renderWithdrawalsTable(withdrawalListElem, totalPendingBadge);
                return;
            }

            const filtered = {};
            Object.keys(allWithdrawalsData).forEach(key => {
                const tx = allWithdrawalsData[key] || {};
                const uid = (tx.uid || "").toLowerCase();
                const phone = (tx.phone || "").toLowerCase();
                if (uid.includes(term) || key.toLowerCase().includes(term) || phone.includes(term)) {
                    filtered[key] = tx;
                }
            });

            if (Object.keys(filtered).length > 0) {
                renderWithdrawalsTable(withdrawalListElem, totalPendingBadge, filtered);
            } else {
                if (withdrawalListElem) {
                    withdrawalListElem.innerHTML = `<tr><td colspan="6" class="text-center text-danger p-4 fw-bold">Pa gen okenn tranzaksyon ki jwenn.</td></tr>`;
                }
            }
        });
    }

    // Filtre bouton yo
    document.querySelectorAll(".filter-btn").forEach(btn => {
        btn.addEventListener("click", (e) => {
            document.querySelectorAll(".filter-btn").forEach(b => b.classList.remove("active"));
            e.target.classList.add("active");
            currentFilter = e.target.getAttribute("data-status") || "all";
            resetToGeneralTable();
        });
    });

    // Modal Anilasyon
    const btnCloseReject = document.getElementById("btn-close-reject-modal");
    if (btnCloseReject) btnCloseReject.addEventListener("click", closeRejectModal);
    
    const btnConfirmReject = document.getElementById("btn-confirm-reject");
    if (btnConfirmReject) {
        btnConfirmReject.addEventListener("click", () => {
            const reasonInput = document.getElementById("reject-reason-input");
            const reason = reasonInput ? reasonInput.value.trim() : "";
            if (!reason) {
                alert("Silvouplè, mete yon rezon pou anilasyon an!");
                return;
            }
            executeReject(db, targetRejectId, targetRejectData, reason);
        });
    }

    // Ekspoze fonksyon yo globalman pou HTML a ka jwenn yo
    window.processApprove = (id) => { executeApprove(db, id); };
    window.openRejectModal = (id, uid, amount) => {
        targetRejectId = id;
        targetRejectData = { uid, amount: parseFloat(amount) || 0 };
        const modal = document.getElementById("modal-reject-reason");
        if (modal) modal.style.display = "flex";
    };
    
    window.copyToClipboard = (text, btnElement) => {
        if (!text || text === "Pas de numéro") return;
        navigator.clipboard.writeText(text).then(() => {
            const originalHTML = btnElement.innerHTML;
            btnElement.innerHTML = `<i class="fa fa-check text-success"></i> Kopye!`;
            setTimeout(() => { btnElement.innerHTML = originalHTML; }, 1500);
        });
    };

    window.selectUserForHistory = (uid) => {
        selectedUserUid = uid;
        renderUserHistory(uid);
    };

    window.resetToGeneralTable = () => {
        selectedUserUid = null;
        const container = document.getElementById("lis-echanj-container");
        if (container) {
            container.innerHTML = originalTableHTML;
        }
        const withdrawalListElem = document.getElementById("admin-withdrawal-list");
        renderWithdrawalsTable(withdrawalListElem, totalPendingBadge);
    };
}

// Kalkile Alèt Badj Wouj yo
function calculateUserPendingAlerts() {
    Object.keys(allUsersData).forEach(uid => { if (allUsersData[uid]) allUsersData[uid].pendingCount = 0; });
    Object.keys(allWithdrawalsData).forEach(key => {
        const tx = allWithdrawalsData[key] || {};
        if (tx.status === "pending" && allUsersData[tx.uid]) {
            allUsersData[tx.uid].pendingCount = (allUsersData[tx.uid].pendingCount || 0) + 1;
        }
    });
}

// Rann Lis Kliyan yo nan Sidebar a
function renderUsersSidebar(container, filteredData = null) {
    if (!container) return;
    container.innerHTML = "";
    const dataToRender = filteredData || allUsersData;
    const uids = Object.keys(dataToRender);

    if (uids.length === 0) {
        container.innerHTML = `<div class="p-3 text-center text-muted small">Pa gen kliyan ki jwenn.</div>`;
        return;
    }

    uids.forEach(uid => {
        const user = dataToRender[uid] || {};
        const alertCount = user.pendingCount || 0;
        const alertBadge = alertCount > 0 ? `<span class="badge bg-danger text-white rounded-circle ms-auto" style="padding: 4px 8px; font-size:10px;">${alertCount}</span>` : '';
        const activeClass = selectedUserUid === uid ? "active-user-item" : "";
        const clientName = user.fullname || "Kliyan San Non";

        container.innerHTML += `
            <div class="user-sidebar-item ${activeClass}" onclick="selectUserForHistory('${uid}')" style="cursor:pointer;">
                <div class="user-avatar">${clientName.charAt(0).toUpperCase()}</div>
                <div style="flex: 1; min-width: 0; margin-left: 10px;">
                    <h6 class="mb-0 text-truncate fw-bold" style="font-size: 13.5px;">${clientName}</h6>
                    <small class="text-muted d-block" style="font-size: 11px;">Sol: ${(user.balance || 0)} HTG</small>
                </div>
                ${alertBadge}
            </div>
        `;
    });
}

// Rann Tablo Demann yo
function renderWithdrawalsTable(listElem, badgeElem, customSource = null) {
    if (!listElem) return;
    listElem.innerHTML = "";
    let pendingCount = 0;
    let hasRows = false;

    const dataSource = customSource || allWithdrawalsData;
    const keys = Object.keys(dataSource);

    keys.forEach(key => {
        const item = dataSource[key];
        if (!item) return;
        const status = item.status || "pending";

        if (status === "pending") pendingCount++;
        if (!customSource && currentFilter !== "all" && status !== currentFilter) return;
        hasRows = true;

        const numMoun = item.phone || "Pas de numéro";
        const senderName = allUsersData[item.uid]?.fullname || item.name || "Kliyan Enkoni";

        listElem.innerHTML += `
            <tr>
                <td><strong>${senderName}</strong><br><small class="text-muted">${item.uid || "---"}</small></td>
                <td>
                    <span class="badge bg-secondary mb-1">${item.method || "MonCash"}</span><br>
                    <button class="btn btn-outline-secondary btn-sm" onclick="copyToClipboard('${numMoun}', this)"><i class="fa fa-copy"></i> ${numMoun}</button>
                </td>
                <td><span class="text-success fw-bold">${(item.amount || 0)} HTG</span></td>
                <td><small>${item.date || "---"}</small></td>
                <td><span class="badge bg-${status === 'validé' ? 'success' : (status === 'anile' ? 'danger' : 'warning')}">${status.toUpperCase()}</span></td>
                <td class="text-center">
                    ${status === "pending" ? `
                        <div class="action-btn-container">
                            <button class="btn btn-success btn-sm" onclick="processApprove('${key}')">Valide</button>
                            <button class="btn btn-danger btn-sm" onclick="openRejectModal('${key}', '${item.uid}', ${item.amount || 0})">Anile</button>
                        </div>
                    ` : `<span class="text-muted small fw-bold">Traite</span>`}
                </td>
            </tr>
        `;
    });

    if (badgeElem && !customSource) badgeElem.innerText = `${pendingCount} En Enstans`;
    if (!hasRows) listElem.innerHTML = `<tr><td colspan="6" class="text-center text-muted p-4">Pa gen demann ki disponib.</td></tr>`;
}

// Rann Istorik Kliyan an
function renderUserHistory(uid) {
    const historyContainer = document.getElementById("lis-echanj-container");
    if (!historyContainer) return;

    const user = allUsersData[uid] || {};
    const userTxKeys = Object.keys(allWithdrawalsData).filter(key => allWithdrawalsData[key]?.uid === uid);

    let txRowsHTML = "";
    if (userTxKeys.length === 0) {
        txRowsHTML = `<tr><td colspan="5" class="text-center text-muted py-4">Kliyan sa a pa gen okenn istorik.</td></tr>`;
    } else {
        userTxKeys.forEach(key => {
            const tx = allWithdrawalsData[key];
            txRowsHTML += `
                <tr>
                    <td><small>${tx.date || "---"}</small></td>
                    <td><span class="badge bg-secondary">${tx.method || "Retrè"}</span><br><small>${tx.phone || ""}</small></td>
                    <td class="fw-bold text-success">${tx.amount} HTG</td>
                    <td><span class="badge bg-${tx.status === 'validé' ? 'success' : (tx.status === 'anile' ? 'danger' : 'warning')}">${(tx.status || 'pending').toUpperCase()}</span></td>
                    <td>
                        ${tx.status === 'pending' ? `
                            <button class="btn btn-success btn-sm p-1" onclick="processApprove('${key}')"><i class="fa fa-check"></i></button>
                            <button class="btn btn-danger btn-sm p-1" onclick="openRejectModal('${key}', '${tx.uid}', ${tx.amount})"><i class="fa fa-ban"></i></button>
                        ` : `<small class="text-muted fw-bold">Peye</small>`}
                    </td>
                </tr>
            `;
        });
    }

    historyContainer.innerHTML = `
        <div class="p-3 bg-light border-bottom d-flex justify-content-between align-items-center rounded-top-3">
            <div>
                <h5 class="mb-0 fw-bold text-dark"><i class="fa fa-user text-primary me-2"></i> Pwofil: ${user.fullname || 'Kliyan'}</h5>
                <small class="text-muted">UID: ${uid}</small>
            </div>
            <span class="badge bg-dark p-2">Sol: ${(user.balance || 0)} HTG</span>
        </div>
        <div class="p-3">
            <div class="table-responsive bg-white rounded shadow-sm border">
                <table class="table table-sm table-hover align-middle mb-0">
                    <thead class="table-dark">
                        <tr><th>Dat</th><th>Metòd</th><th>Montan</th><th>Statut</th><th>Aksyon</th></tr>
                    </thead>
                    <tbody>${txRowsHTML}</tbody>
                </table>
            </div>
            <button class="btn btn-sm btn-secondary mt-3" onclick="resetToGeneralTable()"><i class="fas fa-arrow-left"></i> Retounen nan lis jeneral</button>
        </div>
    `;
}

function executeApprove(db, id) {
    if (!confirm("Èske ou vle valide retrè sa a?")) return;
    const updates = {};
    updates[`/withdrawals/${id}/status`] = "validé";
    updates[`/withdrawals/${id}/processedAt`] = new Date().toLocaleString();
    update(ref(db), updates);
}

function executeReject(db, id, requestData, reason) {
    const userBalanceRef = ref(db, `users/${requestData.uid}/balance`);
    runTransaction(userBalanceRef, (currentBalance) => {
        return (currentBalance || 0) + requestData.amount;
    }).then((result) => {
        if (result.committed) {
            const updates = {};
            updates[`/withdrawals/${id}/status`] = "anile";
            updates[`/withdrawals/${id}/rejectReason`] = reason;
            updates[`/withdrawals/${id}/processedAt`] = new Date().toLocaleString();
            update(ref(db), updates).then(() => { closeRejectModal(); });
        }
    });
}

function closeRejectModal() {
    const modal = document.getElementById("modal-reject-reason");
    if (modal) modal.style.display = "none";
    targetRejectId = null;
    targetRejectData = null;
}
