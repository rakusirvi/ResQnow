let allCases = [];
let currentUser = null;

document.addEventListener("DOMContentLoaded", function () {
  checkAuth();
  initializeDashboard();
});

function checkAuth() {
  const isLoggedIn = localStorage.getItem("isLoggedIn");
  const userData = localStorage.getItem("policeUser");

  if (!isLoggedIn || !userData) {
    window.location.href = "login.html";
    return;
  }

  currentUser = JSON.parse(userData);
  document.getElementById("userInfo").innerHTML = `
        <strong>${currentUser.station}</strong>
        <span>Head ACP: ${currentUser.headACP}</span>
    `;
}

function initializeDashboard() {
  // Event listeners
  document
    .getElementById("refreshBtn")
    .addEventListener("click", loadEmergencies);
  document.getElementById("logoutBtn").addEventListener("click", logout);

  // Tab events
  document.querySelectorAll(".tab-button").forEach((button) => {
    button.addEventListener("click", function () {
      switchTab(this.dataset.tab);
    });
  });

  // Modal events
  document.querySelector(".close-modal").addEventListener("click", closeModal);
  document.getElementById("caseModal").addEventListener("click", function (e) {
    if (e.target === this) closeModal();
  });

  // Load initial data
  loadEmergencies();

  // Real-time listener
  setupRealTimeListener();
}

function loadEmergencies() {
  showLoading(true);

  db.collection("emergencies")
    .orderBy("timestamp", "desc")
    .get()
    .then((snapshot) => {
      allCases = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
      updateDashboard();
      showLoading(false);
    })
    .catch((error) => {
      console.error("Error loading emergencies:", error);
      showError("Failed to load emergency cases");
      showLoading(false);
    });
}

function setupRealTimeListener() {
  db.collection("emergencies")
    .orderBy("timestamp", "desc")
    .onSnapshot(
      (snapshot) => {
        allCases = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));
        updateDashboard();
      },
      (error) => {
        console.error("Real-time listener error:", error);
      }
    );
}

function updateDashboard() {
  updateStats();
  updateTabCounts();
  displayCases("all");
}

function updateStats() {
  const total = allCases.length;
  const pending = allCases.filter(
    (caseItem) => caseItem.status !== "resolved"
  ).length;
  const solved = allCases.filter(
    (caseItem) => caseItem.status === "resolved"
  ).length;

  document.getElementById("totalCases").textContent = total;
  document.getElementById("pendingCases").textContent = pending;
  document.getElementById("solvedCases").textContent = solved;
}

function updateTabCounts() {
  const allCount = allCases.length;
  const pendingCount = allCases.filter(
    (caseItem) => caseItem.status !== "resolved"
  ).length;
  const solvedCount = allCases.filter(
    (caseItem) => caseItem.status === "resolved"
  ).length;

  document.getElementById("allCount").textContent = allCount;
  document.getElementById("pendingCount").textContent = pendingCount;
  document.getElementById("solvedCount").textContent = solvedCount;
}

function switchTab(tabName) {
  // Update active tab
  document.querySelectorAll(".tab-button").forEach((btn) => {
    btn.classList.remove("active");
  });
  document.querySelector(`[data-tab="${tabName}"]`).classList.add("active");

  // Display cases for selected tab
  displayCases(tabName);
}

function displayCases(tabName) {
  let filteredCases = [];

  switch (tabName) {
    case "all":
      filteredCases = allCases;
      document.getElementById("noCasesText").textContent =
        "No emergency requests received yet";
      break;
    case "pending":
      filteredCases = allCases.filter(
        (caseItem) => caseItem.status !== "resolved"
      );
      document.getElementById("noCasesText").textContent = "No pending cases";
      break;
    case "solved":
      filteredCases = allCases.filter(
        (caseItem) => caseItem.status === "resolved"
      );
      document.getElementById("noCasesText").textContent = "No solved cases";
      break;
  }

  const casesList = document.getElementById("casesList");
  const noCasesMessage = document.getElementById("noCasesMessage");

  if (filteredCases.length === 0) {
    casesList.innerHTML = "";
    noCasesMessage.style.display = "block";
    return;
  }

  noCasesMessage.style.display = "none";
  casesList.innerHTML = filteredCases
    .map(
      (caseItem) => `
        <div class="case-card" data-case-id="${caseItem.id}">
            <div class="case-header">
                <div class="case-status ${
                  caseItem.status === "resolved" ? "solved" : "pending"
                }">
                    ${caseItem.status === "resolved" ? "✅" : "🚨"}
                </div>
                <div class="case-title">
                    <h3>${caseItem.userName || "Unknown User"}</h3>
                    <p>${caseItem.userPhone || "No phone"}</p>
                </div>
                <div class="case-time">
                    ${formatTimestamp(caseItem.timestamp)}
                </div>
            </div>
            <div class="case-body">
                <p>📍 ${
                  caseItem.formattedAddress ||
                  caseItem.userAddress ||
                  "Location unknown"
                }</p>
                ${
                  caseItem.status === "resolved"
                    ? `<p class="resolved-info">✅ Resolved by ${
                        caseItem.resolvedBy || "Police"
                      }</p>`
                    : '<p class="pending-info">⏳ Requires attention</p>'
                }
            </div>
            <div class="case-actions">
                <button class="btn-view" onclick="viewCaseDetails('${
                  caseItem.id
                }')">
                    View Details
                </button>
            </div>
        </div>
    `
    )
    .join("");
}

function viewCaseDetails(caseId) {
  const caseItem = allCases.find((c) => c.id === caseId);
  if (!caseItem) return;

  const modalBody = document.getElementById("modalBody");
  modalBody.innerHTML = `
        <div class="case-details">
            <div class="detail-section">
                <h3>User Information</h3>
                <div class="detail-grid">
                    <div class="detail-item">
                        <label>Name:</label>
                        <span>${caseItem.userName || "Unknown"}</span>
                    </div>
                    <div class="detail-item">
                        <label>Phone:</label>
                        <span>${caseItem.userPhone || "Unknown"}</span>
                    </div>
                    <div class="detail-item">
                        <label>Age:</label>
                        <span>${caseItem.userAge || "Unknown"} years</span>
                    </div>
                    <div class="detail-item">
                        <label>Email:</label>
                        <span>${caseItem.userEmail || "Unknown"}</span>
                    </div>
                </div>
            </div>
            
            <div class="detail-section">
                <h3>Location Information</h3>
                <div class="detail-grid">
                    <div class="detail-item">
                        <label>Address:</label>
                        <span>${
                          caseItem.formattedAddress ||
                          caseItem.userAddress ||
                          "Unknown"
                        }</span>
                    </div>
                    ${
                      caseItem.latitude
                        ? `
                    <div class="detail-item">
                        <label>Coordinates:</label>
                        <span>${caseItem.latitude}, ${caseItem.longitude}</span>
                    </div>
                    <div class="detail-item full-width">
                        <button class="btn-map" onclick="openGoogleMaps(${caseItem.latitude}, ${caseItem.longitude})">
                            📍 Open in Google Maps
                        </button>
                    </div>
                    `
                        : ""
                    }
                </div>
            </div>
            
            <div class="detail-section">
                <h3>Emergency Contacts</h3>
                ${
                  caseItem.emergencyContacts &&
                  caseItem.emergencyContacts.length > 0
                    ? caseItem.emergencyContacts
                        .map(
                          (contact) => `
                        <div class="contact-card">
                            <strong>${contact.name}</strong>
                            <span>${contact.phoneNumber}</span>
                            <button class="btn-call" onclick="callNumber('${contact.phoneNumber}')">
                                📞 Call
                            </button>
                        </div>
                    `
                        )
                        .join("")
                    : "<p>No emergency contacts available</p>"
                }
            </div>
            
            ${
              caseItem.status !== "resolved"
                ? `
            <div class="detail-section">
                <h3>Actions</h3>
                <button class="btn-resolve" onclick="resolveCase('${caseItem.id}')">
                    ✅ APPROVE & SEND HELP
                </button>
            </div>
            `
                : `
            <div class="detail-section">
                <h3>Resolution Details</h3>
                <p><strong>Resolved by:</strong> ${
                  caseItem.resolvedBy || "Police"
                }</p>
                <p><strong>Station:</strong> ${
                  caseItem.resolvedStation || "Unknown"
                }</p>
                <p><strong>Message:</strong> ${
                  caseItem.resolutionMessage || "Case resolved"
                }</p>
            </div>
            `
            }
        </div>
    `;

  document.getElementById("caseModal").style.display = "block";
}

function resolveCase(caseId) {
  if (
    !confirm(
      "Are you sure you want to mark this case as resolved and send help?"
    )
  ) {
    return;
  }

  const userData = JSON.parse(localStorage.getItem("policeUser"));

  db.collection("emergencies")
    .doc(caseId)
    .update({
      status: "resolved",
      resolvedBy: userData.headACP,
      resolvedStation: userData.station,
      resolvedAt: firebase.firestore.FieldValue.serverTimestamp(),
      resolutionMessage:
        "Help is on the way! Police team dispatched to your location.",
    })
    .then(() => {
      // Add notification for the user
      return db.collection("notifications").add({
        userId: allCases.find((c) => c.id === caseId).userId,
        emergencyId: caseId,
        title: "Emergency Update",
        message: "Help is on the way! Police team dispatched to your location.",
        timestamp: firebase.firestore.FieldValue.serverTimestamp(),
        type: "status_update",
        read: false,
      });
    })
    .then(() => {
      alert("Case resolved successfully! Help notification sent to user.");
      closeModal();
    })
    .catch((error) => {
      console.error("Error resolving case:", error);
      alert("Error resolving case: " + error.message);
    });
}

function openGoogleMaps(lat, lng) {
  const url = `https://maps.google.com/?q=${lat},${lng}`;
  window.open(url, "_blank");
}

function callNumber(phoneNumber) {
  window.open(`tel:${phoneNumber}`);
}

function closeModal() {
  document.getElementById("caseModal").style.display = "none";
}

function logout() {
  if (confirm("Are you sure you want to logout?")) {
    localStorage.removeItem("isLoggedIn");
    localStorage.removeItem("policeUser");
    window.location.href = "login.html";
  }
}

function showLoading(show) {
  document.getElementById("loadingMessage").style.display = show
    ? "block"
    : "none";
}

function showError(message) {
  alert("Error: " + message);
}

function formatTimestamp(timestamp) {
  if (!timestamp) return "Unknown time";

  const date = timestamp.toDate();
  const now = new Date();
  const diffMs = now - date;
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);

  if (diffMins < 1) return "Just now";
  if (diffMins < 60) return `${diffMins} mins ago`;
  if (diffHours < 24) return `${diffHours} hours ago`;

  return date.toLocaleDateString() + " " + date.toLocaleTimeString();
}
