// ============================================================
// ECHANJ PLUS - ADMIN RETRÈ MODULE (admin-retre.js)
// ============================================================
import { ref, onValue, update, runTransaction } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-database.js";

let currentFilter = "all";
let allWithdrawalsData = {};
let targetRejectId = null;
let targetRejectData = null;

export function initAdminRetre(db) {
    console.log("Modil Retrè Admin Lanse!");
    
    const withdrawalListElem = document.getElementById("admin-withdrawal-list");
    const totalPendingBadge = document.getElementById("total-pending-badge");
    const dbRef = ref(db, "withdrawals");

    // Listen done yo an tan reyèl (Realtime Listener)
    onValue(dbRef, (snapshot) => {
        if (!snapshot.exists()) {
            withdrawalListElem.innerHTML = `<tr><td colspan="6" class="text-center text-muted p-4">Pa gen okenn demann retrè ki fèt.</td></tr>`;
            totalPendingBadge.innerText = "0 En Enstans";
            return;
        }

        allWithdrawalsData = snapshot.val();
        renderWithdrawalsTable(withdrawalListElem, totalPendingBadge);
    });

    // Filtre yo nan klike
    document.querySelectorAll(".filter-btn").forEach(btn => {
        btn.addEventListener("click", (e) => {
            document.querySelectorAll(".filter-btn").forEach(b => b.classList.remove("active"));
            e.target.classList.add("active");
            currentFilter = e.target.getAttribute("data-status");
            renderWithdrawalsTable(withdrawalListElem, totalPendingBadge);
        });
    });

    // Konfigire bouton yo pou Modal Anilasyon an
    document.getElementById("btn-close-reject-modal").addEventListener("click", closeRejectModal);
    document.getElementById("btn-confirm-reject").addEventListener("click", () => {
        const reason = document.getElementById("reject-reason-input").value.trim();
        if (!reason) {
            alert("Silvouplè, mete yon rezon pou anilasyon an!");
            return;
        }
        executeReject(db, targetRejectId, targetRejectData, reason);
    });

    // Ekspoze fonksyon yo sou fenèt mondyal la (window) pou bouton HTML yo ka rele yo
    window.processApprove = (id) => { executeApprove(db, id); };
    window.openRejectModal = (id, uid, amount) => {
        targetRejectId = id;
        targetRejectData = { uid, amount: parseFloat(amount) };
        document.getElementById("reject-reason-input").value = "";
        document.getElementById("modal-reject-reason").classList.remove("hidden");
    };
}

// Fonksyon pou ranpli tablo a dinamikman
function renderWithdrawalsTable(listElem, badgeElem) {
    listElem.innerHTML = "";
    let pendingCount = 0;
    let hasRows = false;

    // Klase pa dat (pi resan an premye)
    const sortedKeys = Object.keys(allWithdrawalsData).sort((a, b) => {
        const dateA = new Date(allWithdrawalsData[a].date || 0);
        const dateB = new Date(allWithdrawalsData[b].date || 0);
        return dateB - dateA;
    });

    sortedKeys.forEach(key => {
        const item = allWithdrawalsData[key];
        const status = item.status || "pending";

        if (status === "pending") pendingCount++;

        // Aplike filtè
        if (currentFilter !== "all" && status !== currentFilter) return;
        hasRows = true;

        let badgeClass = "bg-warning text-dark";
        if (status === "validé") badgeClass = "bg-success";
        if (status === "anile") badgeClass = "bg-danger";

        const row = `
            <tr>
                <td>
                    <span class="fw-bold">${item.name || "Reseptè Enkoni"}</span><br>
                    <small class="text-muted" style="font-size: 11px;">UID: ${item.uid}</small>
                </td>
                <td>
                    <span class="badge bg-light text-dark border">${item.method}</span><br>
                    <span class="fw-bold text-secondary">${item.phone || item.accountDetails || "Pas de numéro"}</span>
                </td>
                <td><span class="text-success fw-bold">${parseFloat(item.amount).toFixed(2)} HTG</span></td>
                <td><small class="text-muted">${item.date || "---"}</small></td>
                <td><span class="badge ${badgeClass}">${status.toUpperCase()}</span></td>
                <td class="text-center">
                    ${status === "pending" ? `
                        <button class="btn btn-success btn-sm me-1 fw-bold" onclick="processApprove('${key}')">
                            <i class="fa fa-check"></i> Valide
                        </button>
                        <button class="btn btn-danger btn-sm fw-bold" onclick="openRejectModal('${key}', '${item.uid}', ${item.amount})">
                            <i class="fa fa-ban"></i> Anile
                        </button>
                    ` : `
                        <span class="text-muted small italic">${item.status === 'validé' ? 'Traite' : 'Remboursé'}</span>
                    `}
                </td>
            </tr>
        `;
        listElem.innerHTML += row;
    });

    badgeElem.innerText = `${pendingCount} En Enstans`;

    if (!hasRows) {
        listElem.innerHTML = `<tr><td colspan="6" class="text-center text-muted p-4">Pa gen demann ki koresponn ak filtè sa a.</td></tr>`;
    }
}

// 1. LOJIK VALIDE RETRÈ
function executeApprove(db, id) {
    if (!confirm("Èske ou sèten ou peye retrè sa a deja epi ou vle valide li?")) return;

    const updates = {};
    updates[`/withdrawals/${id}/status`] = "validé";
    updates[`/withdrawals/${id}/processedAt`] = new Date().toLocaleString();

    update(ref(db), updates)
        .then(() => alert("Retrè a valide avèk siksè!"))
        .catch(err => alert("Erè nan validesyon: " + err.message));
}

// 2. LOJIK ANILE AK RANBOUSMAN SOL AUTOMATIK (Transaction Pwoteje)
function executeReject(db, id, requestData, reason) {
    const userBalanceRef = ref(db, `users/${requestData.uid}/balance`);

    // Sèvi ak yon Transaction pou evite erè si kliyan an sou sit la menm lè a
    runTransaction(userBalanceRef, (currentBalance) => {
        // Si sol la pa egziste oswa li vid, n ap mete montan an, sinon n ap ajoute li sou sa l te genyen an
        return (currentBalance || 0) + requestData.amount;
    }).then((result) => {
        if (result.committed) {
            // Depi sol la fin ranbouse, kounye a nou mete demann lan sou "anile"
            const updates = {};
            updates[`/withdrawals/${id}/status`] = "anile";
            updates[`/withdrawals/${id}/rejectReason`] = reason;
            updates[`/withdrawals/${id}/processedAt`] = new Date().toLocaleString();

            update(ref(db), updates).then(() => {
                alert("Retrè a anile! Kòb la tounen sou kont kliyan an.");
                closeRejectModal();
            });
        }
    }).catch((error) => {
        console.error("Erè nan ranbousman:", error);
        alert("Sistèm nan jwenn yon pwoblèm pou ranbouse kliyan an: " + error.message);
    });
}

function closeRejectModal() {
    document.getElementById("modal-reject-reason").classList.add("hidden");
    targetRejectId = null;
    targetRejectData = null;
              }
          
