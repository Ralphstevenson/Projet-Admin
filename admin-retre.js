// ============================================================
// ECHANJ PLUS - ADMIN RETRÈ MODULE (admin-retre.js)
// ============================================================
import { ref, onValue, update, runTransaction, query, orderByChild, equalTo, get } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-database.js";

let currentFilter = "all";
let allWithdrawalsData = {};
let allUsersData = {};
let targetRejectId = null;
let targetRejectData = null;
let selectedUserUid = null; 

export function initAdminRetre(db) {
    console.log("Modil Retrè Admin Avanse Lanse!");
    
    const withdrawalListElem = document.getElementById("admin-withdrawal-list");
    const totalPendingBadge = document.getElementById("total-pending-badge");
    const userListContainer = document.getElementById("div-clients-list"); 
    
    const dbWithdrawalsRef = ref(db, "withdrawals");
    const dbUsersRef = ref(db, "users");

    // --------------------------------------------------------
    // 1. LISTENERS REALTIME ENDEPANDAN (Pou evite okenn blokaj)
    // --------------------------------------------------------
    
    // Koute demand retrè yo
    onValue(dbWithdrawalsRef, (withdrawalSnapshot) => {
        try {
            allWithdrawalsData = withdrawalSnapshot.exists() ? withdrawalSnapshot.val() : {};
            console.log("Demand retrè yo chaje:", allWithdrawalsData);
            
            calculateUserPendingAlerts();
            renderWithdrawalsTable(withdrawalListElem, totalPendingBadge);
            renderUsersSidebar(userListContainer);
            
            if (selectedUserUid) {
                renderUserHistory(selectedUserUid);
            }
        } catch (err) {
            console.error("Erè nan pwosesis withdrawals snapshot:", err);
        }
    }, (error) => {
        console.error("Erè Realtime withdrawals:", error);
    });

    // Koute itilizatè yo separeman
    onValue(dbUsersRef, (userSnapshot) => {
        try {
            allUsersData = userSnapshot.exists() ? userSnapshot.val() : {};
            console.log("Itilizatè yo chaje:", allUsersData);
            
            calculateUserPendingAlerts();
            renderUsersSidebar(userListContainer);
        } catch (err) {
            console.error("Erè nan pwosesis users snapshot:", err);
        }
    }, (error) => {
        console.error("Erè Realtime users:", error);
    });

    // --------------------------------------------------------
    // 2. SISTÈM RECHÈCH KLIYAN
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
                const name = (u.name || "").toLowerCase();
                const phone = (u.phone || "").toLowerCase();
                if (name.includes(searchValue) || phone.includes(searchValue)) {
                    filteredUsers[uid] = u;
                }
            });
            renderUsersSidebar(userListContainer, filteredUsers);
        });
    }

    // --------------------------------------------------------
    // 3. RECHÈCH TRANZAKSYON PA UID (Sistèm Chache a)
    // --------------------------------------------------------
    const txSearchInput = document.getElementById("tx-search-input");
    const btnSearchTx = document.getElementById("btn-search-tx") || document.querySelector("button[onclick*='Chache']");
    
    // Si w gen yon bouton rechèch nan HTML la
    if (btnSearchTx && txSearchInput) {
        btnSearchTx.addEventListener("click", () => {
            const term = txSearchInput.value.trim();
            if (!term) {
                renderWithdrawalsTable(withdrawalListElem, totalPendingBadge);
                return;
            }

            const filtered = {};
            Object.keys(allWithdrawalsData).forEach(key => {
                const tx = allWithdrawalsData[key] || {};
                if (tx.uid === term || key === term) {
                    filtered[key] = tx;
                }
            });

            if (Object.keys(filtered).length > 0) {
                renderWithdrawalsTable(withdrawalListElem, totalPendingBadge, filtered);
            } else {
                if (withdrawalListElem) {
                    withdrawalListElem.innerHTML = `<tr><td colspan="6" class="text-center text-danger p-4">Pa gen okenn tranzaksyon ki jwenn pou UID sa a.</td></tr>`;
                }
            }
        });
    }

    // Filtre bouton yo (Tout, En Enstans, Validé, Anile)
    document.querySelectorAll(".filter-btn").forEach(btn => {
        btn.addEventListener("click", (e) => {
            document.querySelectorAll(".filter-btn").forEach(b => b.classList.remove("active"));
            e.target.classList.add("active");
            currentFilter = e.target.getAttribute("data-status") || "all";
            renderWithdrawalsTable(withdrawalListElem, totalPendingBadge);
        });
    });

    // Modal Anilasyon koute klike
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

    // Ekspoze fonksyon yo nan window pou bouton HTML yo ka jwenn yo
    window.processApprove = (id) => { executeApprove(db, id); };
    window.openRejectModal = (id, uid, amount) => {
        targetRejectId = id;
        targetRejectData = { uid, amount: parseFloat(amount) || 0 };
        const reasonInput = document.getElementById("reject-reason-input");
        if (reasonInput) reasonInput.value = "";
        const modal = document.getElementById("modal-reject-reason");
        if (modal) modal.classList.remove("hidden");
    };
    
    window.copyToClipboard = (text, btnElement) => {
        if (!text || text === "Pas de numéro") return;
        navigator.clipboard.writeText(text).then(() => {
            const originalHTML = btnElement.innerHTML;
            btnElement.innerHTML = `<i class="fa fa-check text-success"></i> Kopye!`;
            setTimeout(() => { btnElement.innerHTML = originalHTML; }, 1500);
        }).catch(err => console.error("Erè nan kopye:", err));
    };

    window.selectUserForHistory = (uid) => {
        selectedUserUid = uid;
        renderUserHistory(uid);
    };
}

function calculateUserPendingAlerts() {
    try {
        Object.keys(allUsersData).forEach(uid => {
            if (allUsersData[uid]) allUsersData[uid].pendingCount = 0;
        });
        Object.keys(allWithdrawalsData).forEach(key => {
            const tx = allWithdrawalsData[key] || {};
            if (tx.status === "pending" && allUsersData[tx.uid]) {
                allUsersData[tx.uid].pendingCount = (allUsersData[tx.uid].pendingCount || 0) + 1;
            }
        });
    } catch (e) {
        console.error("Erè nan kalkil alèt:", e);
    }
}

function renderUsersSidebar(container, filteredData = null) {
    if (!container) return;
    container.innerHTML = "";
    
    const dataToRender = filteredData || allUsersData;
    const uids = Object.keys(dataToRender);

    if (uids.length === 0) {
        container.innerHTML = `<div class="p-3 text-center text-muted small">Pa gen kliyan nan lis la.</div>`;
        return;
    }

    uids.forEach(uid => {
        const user = dataToRender[uid] || {};
        const alertCount = user.pendingCount || 0;
        const alertBadge = alertCount > 0 
            ? `<span class="badge bg-danger text-white rounded-circle ms-auto px-2" style="font-size: 11px;">${alertCount}</span>` 
            : '';
        const activeClass = selectedUserUid === uid ? "active-user-item" : "";
        const userBalance = typeof user.balance === "number" ? user.balance.toFixed(2) : parseFloat(user.balance || 0).toFixed(2);

        container.innerHTML += `
            <div class="user-sidebar-item ${activeClass} d-flex align-items-center p-3 border-bottom" style="cursor:pointer;" onclick="selectUserForHistory('${uid}')">
                <div class="user-avatar me-2 bg-dark text-white rounded-circle d-flex align-items-center justify-content-center" style="width:35px; height:35px; font-weight:700;">
                    ${(user.name || "U").charAt(0).toUpperCase()}
                </div>
                <div style="flex: 1; min-width: 0;">
                    <h6 class="mb-0 text-truncate fw-bold" style="font-size: 13.5px;">${user.name || "Kliyan San Non"}</h6>
                    <small class="text-muted text-truncate d-block" style="font-size: 11px;">Sol: ${userBalance} HTG</small>
                </div>
                ${alertBadge}
            </div>
        `;
    });
}

function renderWithdrawalsTable(listElem, badgeElem, customSource = null) {
    if (!listElem) return;
    listElem.innerHTML = "";
    let pendingCount = 0;
    let hasRows = false;

    const dataSource = customSource || allWithdrawalsData;
    const sortedKeys = Object.keys(dataSource).sort((a, b) => {
        const dateA = dataSource[a]?.date ? new Date(dataSource[a].date) : 0;
        const dateB = dataSource[b]?.date ? new Date(dataSource[b].date) : 0;
        return dateB - dateA;
    });

    sortedKeys.forEach(key => {
        const item = dataSource[key];
        if (!item) return;
        
        const status = item.status || "pending";

        if (status === "pending") pendingCount++;
        if (!customSource && currentFilter !== "all" && status !== currentFilter) return;
        hasRows = true;

        const numMounLan = item.phone || item.accountDetails || "Pas de numéro";
        const montanKòb = typeof item.amount === "number" ? item.amount.toFixed(2) : parseFloat(item.amount || 0).toFixed(2);

        listElem.innerHTML += `
            <tr>
                <td>
                    <span class="fw-bold">${item.name || "Reseptè Enkoni"}</span><br>
                    <small class="text-muted">UID: ${item.uid || "---"}</small>
                </td>
                <td>
                    <span class="badge bg-dark text-white mb-1">${item.method || "MonCash"}</span><br>
                    <button class="btn btn-sm btn-outline-secondary border px-2 py-1 d-flex align-items-center gap-1" 
                            style="font-size:12px; background:#fff;" 
                            onclick="copyToClipboard('${numMounLan}', this)">
                        <i class="fa fa-copy text-muted"></i> <strong>${numMounLan}</strong>
                    </button>
                </td>
                <td><span class="text-success fw-bold">${montanKòb} HTG</span></td>
                <td><small class="text-muted">${item.date || "---"}</small></td>
                <td><span class="badge bg-${status === 'validé' ? 'success' : (status === 'anile' ? 'danger' : 'warning')}">${status.toUpperCase()}</span></td>
                <td class="text-center">
                    ${status === "pending" ? `
                        <div class="action-btn-container">
                            <button class="btn btn-success btn-sm fw-bold" onclick="processApprove('${key}')">
                                <i class="fa fa-check"></i> Valide
                            </button>
                            <button class="btn btn-danger btn-sm fw-bold" onclick="openRejectModal('${key}', '${item.uid}', ${item.amount || 0})">
                                <i class="fa fa-ban"></i> Anile
                            </button>
                        </div>
                    ` : `
                        <span class="text-center-traite fw-bold text-muted">${status === 'validé' ? 'Validé' : 'Anile'}</span>
                    `}
                </td>
            </tr>
        `;
    });

    if (badgeElem) badgeElem.innerText = `${pendingCount} En Enstans`;
    if (!hasRows) {
        listElem.innerHTML = `<tr><td colspan="6" class="text-center text-muted p-4">Pa gen demann retrè ki disponib.</td></tr>`;
    }
}

function renderUserHistory(uid) {
    const historyContainer = document.getElementById("lis-echanj-container");
    if (!historyContainer) return;

    const user = allUsersData[uid] || {};
    const userTxKeys = Object.keys(allWithdrawalsData).filter(key => allWithdrawalsData[key] && allWithdrawalsData[key].uid === uid);

    let txRowsHTML = "";
    if (userTxKeys.length === 0) {
        txRowsHTML = `<tr><td colspan="5" class="text-center text-muted py-3">Itilizatè sa a pa gen okenn istorik.</td></tr>`;
    } else {
        userTxKeys.sort((a,b) => {
            const dateA = allWithdrawalsData[a]?.date ? new Date(allWithdrawalsData[a].date) : 0;
            const dateB = allWithdrawalsData[b]?.date ? new Date(allWithdrawalsData[b].date) : 0;
            return dateB - dateA;
        }).forEach(key => {
            const tx = allWithdrawalsData[key];
            if (!tx) return;
            const num = tx.phone || tx.accountDetails || "Pas de numéro";
            const txAmount = typeof tx.amount === "number" ? tx.amount.toFixed(2) : parseFloat(tx.amount || 0).toFixed(2);
            
            txRowsHTML += `
                <tr>
                    <td><small>${tx.date || "---"}</small></td>
                    <td><span class="badge bg-secondary">${tx.method || "Retrè"}</span><br><small>${num}</small></td>
                    <td class="fw-bold text-success">${txAmount} HTG</td>
                    <td><span class="badge bg-${tx.status === 'validé' ? 'success' : (tx.status === 'anile' ? 'danger' : 'warning')}">${(tx.status || 'pending').toUpperCase()}</span></td>
                    <td>
                        ${tx.status === 'pending' ? `
                            <button class="btn btn-success btn-sm p-1" onclick="processApprove('${key}')"><i class="fa fa-check"></i></button>
                            <button class="btn btn-danger btn-sm p-1" onclick="openRejectModal('${key}', '${tx.uid}', ${tx.amount || 0})"><i class="fa fa-ban"></i></button>
                        ` : `<small class="text-muted">${tx.status === 'validé' ? 'Peye' : 'Ranbouse'}</small>`}
                    </td>
                </tr>
            `;
        });
    }

    const userBalance = typeof user.balance === "number" ? user.balance.toFixed(2) : parseFloat(user.balance || 0).toFixed(2);

    historyContainer.innerHTML = `
        <div class="p-3 bg-light border-bottom d-flex justify-content-between align-items-center">
            <div>
                <h5 class="mb-0 fw-bold text-dark"><i class="fa fa-user text-primary me-2"></i> Istorik: ${user.name || 'Kliyan'}</h5>
                <small class="text-muted">UID: ${uid}</small>
            </div>
            <div class="text-end">
                <span class="badge bg-dark p-2">Sol: ${userBalance} HTG</span>
            </div>
        </div>
        <div class="p-3">
            <div class="table-responsive bg-white rounded shadow-sm border">
                <table class="table table-sm table-hover align-middle mb-0">
                    <thead class="table-dark" style="font-size:11px;">
                        <tr>
                            <th>Dat</th>
                            <th>Metòd</th>
                            <th>Montan</th>
                            <th>Statut</th>
                            <th>Aksyon</th>
                        </tr>
                    </thead>
                    <tbody style="font-size:12.5px;">
                        ${txRowsHTML}
                    </tbody>
                </table>
            </div>
        </div>
    `;
}

function executeApprove(db, id) {
    if (!confirm("Èske ou sèten ou peye retrè sa a deja epi ou vle valide li?")) return;
    const updates = {};
    updates[`/withdrawals/${id}/status`] = "validé";
    updates[`/withdrawals/${id}/processedAt`] = new Date().toLocaleString();
    update(ref(db), updates).catch(err => alert("Erè nan validasyon: " + err.message));
}

function executeReject(db, id, requestData, reason) {
    if (!requestData || !requestData.uid) return;
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
    }).catch((error) => { alert("Pwoblèm nan ranbousman: " + error.message); });
}

function closeRejectModal() {
    const modal = document.getElementById("modal-reject-reason");
    if (modal) modal.classList.add("hidden");
    targetRejectId = null;
    targetRejectData = null;
}
