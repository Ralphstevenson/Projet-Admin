here// ============================================================
// ECHANJ PLUS - ADMIN RETRÈ MODULE (admin-retre.js)
// ============================================================
import { ref, onValue, update, runTransaction, query, orderByChild, equalTo, get } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-database.js";

let currentFilter = "all";
let allWithdrawalsData = {};
let allUsersData = {};
let targetRejectId = null;
let targetRejectData = null;
let selectedUserUid = null; // Pou konnen kilès ki louvri nan istorik la

export function initAdminRetre(db) {
    console.log("Modil Retrè Admin Avanse Lanse!");
    
    const withdrawalListElem = document.getElementById("admin-withdrawal-list");
    const totalPendingBadge = document.getElementById("total-pending-badge");
    const userListContainer = document.getElementById("div-clients-list"); // Asire w ID sa nan HTML sidebar la
    
    const dbWithdrawalsRef = ref(db, "withdrawals");
    const dbUsersRef = ref(db, "users");

    // --------------------------------------------------------
    // 1. LISTENERS REALTIME (Koute Done yo an tan reyèl)
    // --------------------------------------------------------
    
    // Koute Itilizatè yo pou jere Lis a gòch la ak Alèt Demand yo
    onValue(dbUsersRef, (userSnapshot) => {
        allUsersData = userSnapshot.exists() ? userSnapshot.val() : {};
        
        // Koute demand yo tou pou nou ka mare Alèt yo ansanm
        onValue(dbWithdrawalsRef, (withdrawalSnapshot) => {
            allWithdrawalsData = withdrawalSnapshot.exists() ? withdrawalSnapshot.val() : {};
            
            // Kalkile konbyen demand "pending" chak itilizatè genyen
            calculateUserPendingAlerts();
            
            // Afiche Tablo jeneral la ak Lis Itilizatè yo nan Sidebar a
            renderWithdrawalsTable(withdrawalListElem, totalPendingBadge);
            renderUsersSidebar(userListContainer);
            
            // Si admin lan te deja klike sou yon itilizatè pou wè istorik li, mete istorik la ajou tou
            if (selectedUserUid) {
                renderUserHistory(selectedUserUid);
            }
        });
    });

    // --------------------------------------------------------
    // 2. SISTÈM RECHÈCH DIRÈK NAN FIREBASE (REALTIME QUERIES)
    // --------------------------------------------------------
    
    // Rechèch Itilizatè nan Sidebar a (Pa Non oswa Telefòn)
    const userSearchInput = document.getElementById("user-search-input");
    if (userSearchInput) {
        userSearchInput.addEventListener("input", (e) => {
            const searchValue = e.target.value.trim().toLowerCase();
            if (searchValue === "") {
                renderUsersSidebar(userListContainer);
                return;
            }
            
            // N ap filtre nan done lokal yo ki deja senkronize pou rechèch rapid nan lis la
            const filteredUsers = {};
            Object.keys(allUsersData).forEach(uid => {
                const u = allUsersData[uid];
                const name = (u.name || "").toLowerCase();
                const phone = (u.phone || "").toLowerCase();
                if (name.includes(searchValue) || phone.includes(searchValue)) {
                    filteredUsers[uid] = u;
                }
            });
            renderUsersSidebar(userListContainer, filteredUsers);
        });
    }

    // Rechèch Tranzaksyon dirèk nan Tablo a (Query Firebase pa UID oswa Status)
    const txSearchInput = document.getElementById("tx-search-input");
    const btnSearchTx = document.getElementById("btn-search-tx");
    
    if (btnSearchTx && txSearchInput) {
        btnSearchTx.addEventListener("click", () => {
            const term = txSearchInput.value.trim();
            if (!term) {
                // Si bwat la vid, nou tounen nan lis jeneral la
                onValue(dbWithdrawalsRef, (snap) => {
                    allWithdrawalsData = snap.exists() ? snap.val() : {};
                    renderWithdrawalsTable(withdrawalListElem, totalPendingBadge);
                }, { onlyOnce: true });
                return;
            }

            // Egzekite yon Query Firebase dirèk sou "uid"
            const txQuery = query(ref(db, "withdrawals"), orderByChild("uid"), equalTo(term));
            get(txQuery).then((snapshot) => {
                if (snapshot.exists()) {
                    allWithdrawalsData = snapshot.val();
                    renderWithdrawalsTable(withdrawalListElem, totalPendingBadge);
                } else {
                    withdrawalListElem.innerHTML = `<tr><td colspan="6" class="text-center text-danger p-4">Pa gen okenn tranzaksyon ki jwenn pou UID sa a nan Firebase.</td></tr>`;
                }
            }).catch(err => alert("Erè nan rechèch Firebase: " + err.message));
        });
    }

    // Filtre Tablo Jeneral la nan klike sou bouton statut yo
    document.querySelectorAll(".filter-btn").forEach(btn => {
        btn.addEventListener("click", (e) => {
            document.querySelectorAll(".filter-btn").forEach(b => b.classList.remove("active"));
            e.target.classList.add("active");
            currentFilter = e.target.getAttribute("data-status");
            renderWithdrawalsTable(withdrawalListElem, totalPendingBadge);
        });
    });

    // Modal Bouton fèmen ak Konfime
    document.getElementById("btn-close-reject-modal").addEventListener("click", closeRejectModal);
    document.getElementById("btn-confirm-reject").addEventListener("click", () => {
        const reason = document.getElementById("reject-reason-input").value.trim();
        if (!reason) {
            alert("Silvouplè, mete yon rezon pou anilasyon an!");
            return;
        }
        executeReject(db, targetRejectId, targetRejectData, reason);
    });

    // --------------------------------------------------------
    // 3. EKSPOZE FONKSYON YO SOU WINDOWS (GLOBAL)
    // --------------------------------------------------------
    window.processApprove = (id) => { executeApprove(db, id); };
    window.openRejectModal = (id, uid, amount) => {
        targetRejectId = id;
        targetRejectData = { uid, amount: parseFloat(amount) };
        document.getElementById("reject-reason-input").value = "";
        document.getElementById("modal-reject-reason").classList.remove("hidden");
    };
    
    // Fonksyon pou kopye nimewo nan yon sèl klik
    window.copyToClipboard = (text, btnElement) => {
        if (!text || text === "Pas de numéro") return;
        navigator.clipboard.writeText(text).then(() => {
            const originalHTML = btnElement.innerHTML;
            btnElement.innerHTML = `<i class="fa fa-check text-success"></i> Kopye!`;
            btnElement.style.borderColor = "#16a34a";
            setTimeout(() => {
                btnElement.innerHTML = originalHTML;
                btnElement.style.borderColor = "";
            }, 1500);
        }).catch(err => console.error("Erè nan kopye:", err));
    };

    // Klike sou yon itilizatè nan sidebar a pou louvri Istorik li
    window.selectUserForHistory = (uid) => {
        selectedUserUid = uid;
        renderUserHistory(uid);
    };
}

// --------------------------------------------------------
// KÒ PWOSEDIDIL AK RENDERING
// --------------------------------------------------------

// Kalkile konbyen demand ki "pending" pou chak itilizatè
function calculateUserPendingAlerts() {
    // Rele tout itilizatè yo pou mete alèt yo sou 0 anvan
    Object.keys(allUsersData).forEach(uid => {
        allUsersData[uid].pendingCount = 0;
    });

    // Pakouri tout demand retrè yo pou n ogmante konte a si li "pending"
    Object.keys(allWithdrawalsData).forEach(key => {
        const tx = allWithdrawalsData[key];
        if (tx.status === "pending" && allUsersData[tx.uid]) {
            allUsersData[tx.uid].pendingCount += 1;
        }
    });
}

// Ranpli Sidebar Itilizatè yo ak sistèm Alèt la
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
        const user = dataToRender[uid];
        const alertCount = user.pendingCount || 0;
        
        // Kreyasyon badj Alèt wouj la (L ap rete la depi gen demand pending, menmsi admin an fin gade l)
        const alertBadge = alertCount > 0 
            ? `<span class="badge bg-danger text-white rounded-circle ms-auto px-2" style="font-size: 11px; animation: pulse 1.5s infinite;">${alertCount}</span>` 
            : '';

        const activeClass = selectedUserUid === uid ? "active-user-item" : "";

        const userRow = `
            <div class="user-sidebar-item ${activeClass} d-flex align-items-center p-3 border-bottom" style="cursor:pointer;" onclick="selectUserForHistory('${uid}')">
                <div class="user-avatar me-2 bg-dark text-white rounded-circle d-flex align-items-center justify-content-center" style="width:35px; height:35px; font-weight:700;">
                    ${(user.name || "U").charAt(0).toUpperCase()}
                </div>
                <div style="flex: 1; min-width: 0;">
                    <h6 class="mb-0 text-truncate fw-bold" style="font-size: 13.5px; color:#0f172a;">${user.name || "Itilizatè san non"}</h6>
                    <small class="text-muted text-truncate d-block" style="font-size: 11px;">Sol: ${(user.balance || 0).toFixed(2)} HTG</small>
                </div>
                ${alertBadge}
            </div>
        `;
        container.innerHTML += userRow;
    });
}

// Afiche tablo jeneral retrè yo
function renderWithdrawalsTable(listElem, badgeElem) {
    if (!listElem) return;
    listElem.innerHTML = "";
    let pendingCount = 0;
    let hasRows = false;

    const sortedKeys = Object.keys(allWithdrawalsData).sort((a, b) => {
        return new Date(allWithdrawalsData[b].date || 0) - new Date(allWithdrawalsData[a].date || 0);
    });

    sortedKeys.forEach(key => {
        const item = allWithdrawalsData[key];
        const status = item.status || "pending";

        if (status === "pending") pendingCount++;
        if (currentFilter !== "all" && status !== currentFilter) return;
        hasRows = true;

        const numMoun lan = item.phone || item.accountDetails || "Pas de numéro";

        const row = `
            <tr>
                <td>
                    <span class="fw-bold">${item.name || "Reseptè Enkoni"}</span><br>
                    <small class="text-muted">UID: ${item.uid}</small>
                </td>
                <td>
                    <span class="badge bg-dark text-white mb-1">${item.method}</span><br>
                    <button class="btn btn-sm btn-outline-secondary border px-2 py-1 d-flex align-items-center gap-1" 
                            style="font-size:12px; border-radius:6px; background:#fff;" 
                            onclick="copyToClipboard('${numMoun lan}', this)" title="Klike pou kopye nimewo a">
                        <i class="fa fa-copy text-muted"></i> <strong>${numMoun lan}</strong>
                    </button>
                </td>
                <td><span class="text-success fw-bold">${parseFloat(item.amount).toFixed(2)} HTG</span></td>
                <td><small class="text-muted">${item.date || "---"}</small></td>
                <td><span class="badge bg-${status === 'validé' ? 'success' : (status === 'anile' ? 'danger' : 'warning')}">${status.toUpperCase()}</span></td>
                <td class="text-center">
                    ${status === "pending" ? `
                        <div class="action-btn-container">
                            <button class="btn btn-success btn-sm fw-bold" onclick="processApprove('${key}')">
                                <i class="fa fa-check"></i> Valide
                            </button>
                            <button class="btn btn-danger btn-sm fw-bold" onclick="openRejectModal('${key}', '${item.uid}', ${item.amount})">
                                <i class="fa fa-ban"></i> Anile
                            </button>
                        </div>
                    ` : `
                        <span class="text-center-traite">${status === 'validé' ? 'Traite' : 'Anile'}</span>
                    `}
                </td>
            </tr>
        `;
        listElem.innerHTML += row;
    });

    if (badgeElem) badgeElem.innerText = `${pendingCount} En Enstans`;
    if (!hasRows) {
        listElem.innerHTML = `<tr><td colspan="6" class="text-center text-muted p-4">Pa gen demann ki koresponn.</td></tr>`;
    }
}

// Rann Istorik pèsonalize yon sèl itilizatè ki klike
function renderUserHistory(uid) {
    const historyContainer = document.getElementById("lis-echanj-container"); // Bò dwat viewport a
    if (!historyContainer) return;

    const user = allUsersData[uid] || {};
    
    // Filtre tout tranzaksyon ki pou itilizatè sa a sèlman
    const userTxKeys = Object.keys(allWithdrawalsData).filter(key => allWithdrawalsData[key].uid === uid);

    let txRowsHTML = "";
    if (userTxKeys.length === 0) {
        txRowsHTML = `<tr><td colspan="5" class="text-center text-muted py-3">Itilizatè sa a pa gen okenn istorik retrè.</td></tr>`;
    } else {
        userTxKeys.sort((a,b) => new Date(allWithdrawalsData[b].date || 0) - new Date(allWithdrawalsData[a].date || 0)).forEach(key => {
            const tx = allWithdrawalsData[key];
            const num = tx.phone || tx.accountDetails || "Pas de numéro";
            txRowsHTML += `
                <tr>
                    <td><small>${tx.date || "---"}</small></td>
                    <td><span class="badge bg-secondary">${tx.method}</span><br><small>${num}</small></td>
                    <td class="fw-bold text-success">${parseFloat(tx.amount).toFixed(2)} HTG</td>
                    <td><span class="badge bg-${tx.status === 'validé' ? 'success' : (tx.status === 'anile' ? 'danger' : 'warning')}">${(tx.status || 'pending').toUpperCase()}</span></td>
                    <td>
                        ${tx.status === 'pending' ? `
                            <button class="btn btn-success btn-sm p-1" onclick="processApprove('${key}')" title="Valide"><i class="fa fa-check"></i></button>
                            <button class="btn btn-danger btn-sm p-1" onclick="openRejectModal('${key}', '${tx.uid}', ${tx.amount})" title="Anile"><i class="fa fa-ban"></i></button>
                        ` : `<small class="text-muted">${tx.status === 'validé' ? 'Peye' : 'Ranbouse'}</small>`}
                    </td>
                </tr>
            `;
        });
    }

    // Ranplase Viewport dwat la ak bèl estrikti sa a
    historyContainer.innerHTML = `
        <div class="p-3 bg-light border-bottom d-flex justify-content-between align-items-center">
            <div>
                <h5 class="mb-0 fw-bold text-dark"><i class="fa fa-user text-primary me-2"></i> Istorik: ${user.name || 'Kliyan'}</h5>
                <small class="text-muted">UID: ${uid} | Imèl: ${user.email || 'Pas d\'email'}</small>
            </div>
            <div class="text-end">
                <span class="badge bg-dark p-2">Sol aktyèl: ${(user.balance || 0).toFixed(2)} HTG</span>
            </div>
        </div>
        <div class="p-3">
            <h6 class="fw-bold text-secondary mb-3"><i class="fa fa-history me-1"></i> Tout Tranzaksyon Retrè Moun Sa A</h6>
            <div class="table-responsive bg-white rounded shadow-sm border">
                <table class="table table-sm table-hover align-middle mb-0">
                    <thead class="table-dark" style="font-size:11px;">
                        <tr>
                            <th>Dat</th>
                            <th>Metòd & Nimewo</th>
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

// --------------------------------------------------------
// FONKSYON AKSYON FIREBASE (APPROVE / REJECT)
// --------------------------------------------------------

function executeApprove(db, id) {
    if (!confirm("Èske ou sèten ou peye retrè sa a deja epi ou vle valide li?")) return;

    const updates = {};
    updates[`/withdrawals/${id}/status`] = "validé";
    updates[`/withdrawals/${id}/processedAt`] = new Date().toLocaleString();

    update(ref(db), updates)
        .then(() => alert("Retrè a valide avèk siksè!"))
        .catch(err => alert("Erè: " + err.message));
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

            update(ref(db), updates).then(() => {
                alert("Retrè a anile! Kòb la tounen sou kont kliyan an otomatikman.");
                closeRejectModal();
            });
        }
    }).catch((error) => {
        console.error("Erè nan ranbousman:", error);
        alert("Pwoblèm nan ranbousman: " + error.message);
    });
}

function closeRejectModal() {
    document.getElementById("modal-reject-reason").classList.add("hidden");
    targetRejectId = null;
    targetRejectData = null;
}
