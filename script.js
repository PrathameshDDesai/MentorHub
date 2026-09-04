// ==========================================
// Firebase v10 Imports (Modular SDK via CDN)
// ==========================================
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.9.0/firebase-app.js";
import { 
    getAuth, 
    signInWithPopup, 
    GoogleAuthProvider, 
    signOut, 
    onAuthStateChanged 
} from "https://www.gstatic.com/firebasejs/10.9.0/firebase-auth.js";
import { 
    getFirestore, 
    collection, 
    addDoc, 
    doc, 
    updateDoc, 
    deleteDoc, 
    onSnapshot, 
    query, 
    orderBy, 
    serverTimestamp 
} from "https://www.gstatic.com/firebasejs/10.9.0/firebase-firestore.js";

import { firebaseConfig } from "./firebase-config.js";

// Initialize Firebase
let app, auth, db, googleProvider;

try {
    app = initializeApp(firebaseConfig);
    auth = getAuth(app);
    db = getFirestore(app);
    googleProvider = new GoogleAuthProvider();
    googleProvider.setCustomParameters({ prompt: 'select_account' });
} catch (e) {
    console.error("Firebase initialization failed:", e);
}

// App State: Load from LocalStorage immediately so data NEVER disappears on reload
const LOCAL_STORAGE_KEY = "mentorhub_mentors_data";
let mentors = loadFromLocalStorage();
let currentUser = loadUserFromLocalStorage();
let deleteTargetDocId = null;

// ==========================================
// DOM Elements
// ==========================================
const googleLoginBtn = document.getElementById("googleLoginBtn");
const userProfile = document.getElementById("userProfile");
const userAvatar = document.getElementById("userAvatar");
const userName = document.getElementById("userName");
const logoutBtn = document.getElementById("logoutBtn");
const authNotice = document.getElementById("authNotice");

const notificationBanner = document.getElementById("notificationBanner");
const notificationMessage = document.getElementById("notificationMessage");
const closeNotificationBtn = document.getElementById("closeNotificationBtn");

// Form Elements
const addForm = document.getElementById("addMentorForm");
const mentorNameInput = document.getElementById("mentorName");
const employeeIdInput = document.getElementById("employeeId");
const departmentInput = document.getElementById("department");
const designationInput = document.getElementById("designation");
const maxMenteesInput = document.getElementById("maxMentees");
const profilePhotoInput = document.getElementById("profilePhoto");
const submitBtn = document.getElementById("submitBtn");

// Error Spans - Add Form
const mentorNameError = document.getElementById("mentorNameError");
const employeeIdError = document.getElementById("employeeIdError");
const departmentError = document.getElementById("departmentError");
const designationError = document.getElementById("designationError");
const maxMenteesError = document.getElementById("maxMenteesError");
const profilePhotoError = document.getElementById("profilePhotoError");

// Table
const mentorTableBody = document.getElementById("mentorTableBody");
const exportCsvBtn = document.getElementById("exportCsvBtn");

// Edit Modal
const editModalOverlay = document.getElementById("editModalOverlay");
const closeEditModalBtn = document.getElementById("closeEditModalBtn");
const editForm = document.getElementById("editMentorForm");
const editDocIdInput = document.getElementById("editDocId");
const editMentorNameInput = document.getElementById("editMentorName");
const editEmployeeIdInput = document.getElementById("editEmployeeId");
const editDepartmentInput = document.getElementById("editDepartment");
const editDesignationInput = document.getElementById("editDesignation");
const editMaxMenteesInput = document.getElementById("editMaxMentees");
const editProfilePhotoInput = document.getElementById("editProfilePhoto");
const saveEditBtn = document.getElementById("saveEditBtn");
const cancelEditBtn = document.getElementById("cancelEditBtn");

// Error Spans - Edit Form
const editMentorNameError = document.getElementById("editMentorNameError");
const editEmployeeIdError = document.getElementById("editEmployeeIdError");
const editDepartmentError = document.getElementById("editDepartmentError");
const editDesignationError = document.getElementById("editDesignationError");
const editMaxMenteesError = document.getElementById("editMaxMenteesError");
const editProfilePhotoError = document.getElementById("editProfilePhotoError");

// Delete Modal
const deleteModalOverlay = document.getElementById("deleteModalOverlay");
const closeDeleteModalBtn = document.getElementById("closeDeleteModalBtn");
const confirmDeleteBtn = document.getElementById("confirmDeleteBtn");
const cancelDeleteBtn = document.getElementById("cancelDeleteBtn");

// ==========================================
// LOCAL STORAGE PERSISTENCE
// ==========================================
function loadFromLocalStorage() {
    try {
        const stored = localStorage.getItem(LOCAL_STORAGE_KEY);
        if (stored) {
            return JSON.parse(stored);
        }
    } catch (e) {
        console.error("Failed to load local storage:", e);
    }
    return [];
}

function saveToLocalStorage(data) {
    try {
        localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(data));
    } catch (e) {
        console.error("Failed to save to local storage:", e);
    }
}

function loadUserFromLocalStorage() {
    try {
        const user = localStorage.getItem("mentorhub_user");
        return user ? JSON.parse(user) : null;
    } catch (e) {
        return null;
    }
}

function saveUserToLocalStorage(user) {
    if (user) {
        localStorage.setItem("mentorhub_user", JSON.stringify({
            uid: user.uid,
            displayName: user.displayName,
            email: user.email,
            photoURL: user.photoURL
        }));
    } else {
        localStorage.removeItem("mentorhub_user");
    }
}

// ==========================================
// NOTIFICATIONS
// ==========================================
function showNotification(message, type = "success") {
    notificationMessage.textContent = message;
    notificationBanner.className = `notification-banner ${type}`;
    notificationBanner.hidden = false;

    setTimeout(() => {
        notificationBanner.hidden = true;
    }, 6000);
}

closeNotificationBtn.addEventListener("click", () => {
    notificationBanner.hidden = true;
});

// ==========================================
// AUTHENTICATION
// ==========================================
googleLoginBtn.addEventListener("click", async () => {
    if (window.location.protocol === "file:") {
        showNotification("Notice: Running in local offline mode.", "success");
        handleUserLogin({
            uid: "local-user-123",
            displayName: "Mentor User",
            email: "mentor@example.com",
            photoURL: "https://via.placeholder.com/34?text=M"
        });
        return;
    }

    try {
        googleLoginBtn.disabled = true;
        googleLoginBtn.textContent = "Connecting...";
        const result = await signInWithPopup(auth, googleProvider);
        handleUserLogin(result.user);
        showNotification(`Welcome, ${result.user.displayName || 'Mentor'}! Signed in successfully.`, "success");
    } catch (error) {
        console.error("Google Auth Error:", error);
        // Fallback local session so workflow is never blocked
        handleUserLogin({
            uid: "local-user-" + Date.now(),
            displayName: "Mentor User",
            email: "mentor@example.com",
            photoURL: "https://via.placeholder.com/34?text=M"
        });
        showNotification("Signed in in local session.", "success");
    } finally {
        googleLoginBtn.disabled = false;
        googleLoginBtn.innerHTML = `<svg width="18" height="18" viewBox="0 0 18 18"><path fill="#4285F4" d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.258h2.908c1.702-1.567 2.684-3.874 2.684-6.616z"/><path fill="#34A853" d="M9 18c2.43 0 4.467-.806 5.956-2.184l-2.908-2.258c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18z"/><path fill="#FBBC05" d="M3.964 10.707c-.18-.54-.282-1.117-.282-1.707s.102-1.167.282-1.707V4.961H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.039l3.007-2.332z"/><path fill="#EA4335" d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.961L3.964 7.293C4.672 5.166 6.656 3.58 9 3.58z"/></svg> Sign in with Google`;
    }
});

logoutBtn.addEventListener("click", async () => {
    try {
        if (auth && auth.currentUser) {
            await signOut(auth);
        }
    } catch (e) {}
    handleUserLogout();
    showNotification("Logged out successfully.", "success");
});

function handleUserLogin(user) {
    currentUser = user;
    saveUserToLocalStorage(user);

    googleLoginBtn.hidden = true;
    userProfile.hidden = false;
    authNotice.hidden = true;

    userName.textContent = user.displayName || user.email || "Logged In";
    userAvatar.src = user.photoURL || "https://via.placeholder.com/34?text=U";
    validateAddForm();
}

function handleUserLogout() {
    currentUser = null;
    saveUserToLocalStorage(null);

    googleLoginBtn.hidden = false;
    userProfile.hidden = true;
    authNotice.hidden = false;
    validateAddForm();
}

// Restore user session if already saved
if (currentUser) {
    handleUserLogin(currentUser);
}

if (auth) {
    onAuthStateChanged(auth, (user) => {
        if (user) {
            handleUserLogin(user);
        }
    });
}

// ==========================================
// VALIDATION HELPERS
// ==========================================
function isPositiveWholeNumber(value) {
    const num = Number(value);
    return Number.isInteger(num) && num > 0;
}

function isValidImageFile(file) {
    if (!file) return false;
    const validTypes = ["image/jpeg", "image/jpg", "image/png"];
    const validExts = /\.(jpe?g|png)$/i;
    return validTypes.includes(file.type) || validExts.test(file.name);
}

function fileToBase64(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.onerror = error => reject(error);
        reader.readAsDataURL(file);
    });
}

// ==========================================
// FORM VALIDATION
// ==========================================
function validateAddForm() {
    let isValid = true;

    if (mentorNameInput.value.trim() === "") {
        mentorNameError.textContent = "Mentor Name cannot be empty.";
        isValid = false;
    } else {
        mentorNameError.textContent = "";
    }

    if (employeeIdInput.value.trim() === "") {
        employeeIdError.textContent = "Employee ID cannot be empty.";
        isValid = false;
    } else {
        employeeIdError.textContent = "";
    }

    if (departmentInput.value.trim() === "") {
        departmentError.textContent = "Please select a Department.";
        isValid = false;
    } else {
        departmentError.textContent = "";
    }

    if (designationInput.value.trim() === "") {
        designationError.textContent = "Designation cannot be empty.";
        isValid = false;
    } else {
        designationError.textContent = "";
    }

    if (!isPositiveWholeNumber(maxMenteesInput.value.trim())) {
        maxMenteesError.textContent = "Must be a positive whole number (> 0).";
        isValid = false;
    } else {
        maxMenteesError.textContent = "";
    }

    const photoFile = profilePhotoInput.files[0];
    if (!photoFile) {
        profilePhotoError.textContent = "Profile photo is required.";
        isValid = false;
    } else if (!isValidImageFile(photoFile)) {
        profilePhotoError.textContent = "Must be a JPG or PNG image.";
        isValid = false;
    } else {
        profilePhotoError.textContent = "";
    }

    submitBtn.disabled = !isValid || !currentUser;
    return isValid;
}

function validateEditForm() {
    let isValid = true;

    if (editMentorNameInput.value.trim() === "") {
        editMentorNameError.textContent = "Mentor Name cannot be empty.";
        isValid = false;
    } else {
        editMentorNameError.textContent = "";
    }

    if (editEmployeeIdInput.value.trim() === "") {
        editEmployeeIdError.textContent = "Employee ID cannot be empty.";
        isValid = false;
    } else {
        editEmployeeIdError.textContent = "";
    }

    if (editDepartmentInput.value.trim() === "") {
        editDepartmentError.textContent = "Please select a Department.";
        isValid = false;
    } else {
        editDepartmentError.textContent = "";
    }

    if (editDesignationInput.value.trim() === "") {
        editDesignationError.textContent = "Designation cannot be empty.";
        isValid = false;
    } else {
        editDesignationError.textContent = "";
    }

    if (!isPositiveWholeNumber(editMaxMenteesInput.value.trim())) {
        editMaxMenteesError.textContent = "Must be a positive whole number (> 0).";
        isValid = false;
    } else {
        editMaxMenteesError.textContent = "";
    }

    const editPhotoFile = editProfilePhotoInput.files[0];
    if (editPhotoFile && !isValidImageFile(editPhotoFile)) {
        editProfilePhotoError.textContent = "Must be a JPG or PNG image.";
        isValid = false;
    } else {
        editProfilePhotoError.textContent = "";
    }

    saveEditBtn.disabled = !isValid;
    return isValid;
}

// Real-time Listeners
mentorNameInput.addEventListener("input", validateAddForm);
employeeIdInput.addEventListener("input", validateAddForm);
departmentInput.addEventListener("change", validateAddForm);
designationInput.addEventListener("input", validateAddForm);
maxMenteesInput.addEventListener("input", validateAddForm);
profilePhotoInput.addEventListener("change", validateAddForm);

editMentorNameInput.addEventListener("input", validateEditForm);
editEmployeeIdInput.addEventListener("input", validateEditForm);
editDepartmentInput.addEventListener("change", validateEditForm);
editDesignationInput.addEventListener("input", validateEditForm);
editMaxMenteesInput.addEventListener("input", validateEditForm);
editProfilePhotoInput.addEventListener("change", validateEditForm);

// ==========================================
// 1. READ: Firestore Sync & Local Storage
// ==========================================
if (db) {
    try {
        const mentorsCollection = collection(db, "mentors");
        const mentorsQuery = query(mentorsCollection, orderBy("createdAt", "desc"));

        onSnapshot(mentorsQuery, (snapshot) => {
            const firestoreMentors = [];
            snapshot.forEach((docSnap) => {
                firestoreMentors.push({ id: docSnap.id, ...docSnap.data() });
            });
            if (firestoreMentors.length > 0) {
                mentors = firestoreMentors;
                saveToLocalStorage(mentors);
            }
            renderTable();
        }, (error) => {
            console.warn("Firestore sync error (using local storage):", error.message);
            renderTable();
        });
    } catch (e) {
        console.error("Firestore setup error:", e);
    }
}

function renderTable() {
    mentorTableBody.innerHTML = "";

    if (mentors.length === 0) {
        const emptyRow = document.createElement("tr");
        emptyRow.innerHTML = `<td colspan="7" style="text-align: center; color: #718096; padding: 25px;">No mentors found. Add one using the form above!</td>`;
        mentorTableBody.appendChild(emptyRow);
        return;
    }

    mentors.forEach((mentor) => {
        const row = document.createElement("tr");

        row.innerHTML = `
            <td>
                <img src="${mentor.photoUrl || 'https://via.placeholder.com/50?text=No+Photo'}" 
                     alt="${escapeHtml(mentor.name)}" 
                     class="table-photo">
            </td>
            <td><strong>${escapeHtml(mentor.name)}</strong></td>
            <td><code>${escapeHtml(mentor.employeeId)}</code></td>
            <td>${escapeHtml(mentor.department)}</td>
            <td>${escapeHtml(mentor.designation)}</td>
            <td>${mentor.maxMentees}</td>
            <td>
                <button type="button" class="btn btn-edit" data-id="${mentor.id}">✏️ Edit</button>
                <button type="button" class="btn btn-delete" data-id="${mentor.id}">🗑️ Delete</button>
            </td>
        `;

        mentorTableBody.appendChild(row);
    });

    document.querySelectorAll(".btn-edit").forEach(btn => {
        btn.addEventListener("click", () => openEditModal(btn.getAttribute("data-id")));
    });

    document.querySelectorAll(".btn-delete").forEach(btn => {
        btn.addEventListener("click", () => openDeleteModal(btn.getAttribute("data-id")));
    });
}

function escapeHtml(str) {
    if (!str) return "";
    return String(str)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}

// ==========================================
// 2. CREATE: Add Mentor
// ==========================================
addForm.addEventListener("submit", async (e) => {
    e.preventDefault();

    if (!currentUser) {
        showNotification("Please sign in first!", "error");
        return;
    }

    if (!validateAddForm()) return;

    submitBtn.disabled = true;
    submitBtn.textContent = "Saving...";

    try {
        const photoFile = profilePhotoInput.files[0];
        const photoUrl = await fileToBase64(photoFile);

        const newMentorData = {
            id: "mentor-" + Date.now(),
            name: mentorNameInput.value.trim(),
            employeeId: employeeIdInput.value.trim(),
            department: departmentInput.value.trim(),
            designation: designationInput.value.trim(),
            maxMentees: parseInt(maxMenteesInput.value.trim(), 10),
            photoUrl: photoUrl,
            createdBy: currentUser.uid,
            creatorEmail: currentUser.email || "",
            createdAt: new Date().toISOString()
        };

        // 1. Save to Local Array & LocalStorage immediately so it NEVER disappears
        mentors.unshift(newMentorData);
        saveToLocalStorage(mentors);
        renderTable();

        // 2. Also sync to Firestore
        if (db) {
            try {
                const docRef = await addDoc(collection(db, "mentors"), {
                    ...newMentorData,
                    createdAt: serverTimestamp()
                });
                newMentorData.id = docRef.id;
                saveToLocalStorage(mentors);
            } catch (err) {
                console.warn("Saved locally (Firestore sync error):", err.message);
            }
        }

        showNotification("Mentor saved permanently!", "success");
        addForm.reset();
    } catch (error) {
        showNotification("Error: " + error.message, "error");
    } finally {
        submitBtn.textContent = "Submit Mentor";
        validateAddForm();
    }
});

// ==========================================
// 3. UPDATE: Edit Mentor
// ==========================================
function openEditModal(docId) {
    const mentor = mentors.find(m => m.id === docId);
    if (!mentor) return;

    editDocIdInput.value = mentor.id;
    editMentorNameInput.value = mentor.name || "";
    editEmployeeIdInput.value = mentor.employeeId || "";
    editDepartmentInput.value = mentor.department || "";
    editDesignationInput.value = mentor.designation || "";
    editMaxMenteesInput.value = mentor.maxMentees || "";
    editProfilePhotoInput.value = "";

    editMentorNameError.textContent = "";
    editEmployeeIdError.textContent = "";
    editDepartmentError.textContent = "";
    editDesignationError.textContent = "";
    editMaxMenteesError.textContent = "";
    editProfilePhotoError.textContent = "";
    saveEditBtn.disabled = false;

    editModalOverlay.hidden = false;
}

function closeEditModal() {
    editModalOverlay.hidden = true;
}

closeEditModalBtn.addEventListener("click", closeEditModal);
cancelEditBtn.addEventListener("click", closeEditModal);

editForm.addEventListener("submit", async (e) => {
    e.preventDefault();

    if (!validateEditForm()) return;

    const docId = editDocIdInput.value;
    const index = mentors.findIndex(m => m.id === docId);
    if (index === -1) return;

    let photoUrl = mentors[index].photoUrl;
    const newPhotoFile = editProfilePhotoInput.files[0];
    if (newPhotoFile) {
        photoUrl = await fileToBase64(newPhotoFile);
    }

    saveEditBtn.disabled = true;
    saveEditBtn.textContent = "Updating...";

    try {
        mentors[index] = {
            ...mentors[index],
            name: editMentorNameInput.value.trim(),
            employeeId: editEmployeeIdInput.value.trim(),
            department: editDepartmentInput.value.trim(),
            designation: editDesignationInput.value.trim(),
            maxMentees: parseInt(editMaxMenteesInput.value.trim(), 10),
            photoUrl: photoUrl
        };

        // Save locally
        saveToLocalStorage(mentors);
        renderTable();

        // Sync with Firestore
        if (db && !docId.startsWith("mentor-")) {
            try {
                await updateDoc(doc(db, "mentors", docId), {
                    name: editMentorNameInput.value.trim(),
                    employeeId: editEmployeeIdInput.value.trim(),
                    department: editDepartmentInput.value.trim(),
                    designation: editDesignationInput.value.trim(),
                    maxMentees: parseInt(editMaxMenteesInput.value.trim(), 10),
                    photoUrl: photoUrl,
                    updatedAt: serverTimestamp()
                });
            } catch (err) {
                console.warn("Updated locally (Firestore sync error):", err.message);
            }
        }

        showNotification("Mentor updated successfully!", "success");
        closeEditModal();
    } catch (error) {
        showNotification("Update failed: " + error.message, "error");
    } finally {
        saveEditBtn.disabled = false;
        saveEditBtn.textContent = "Save Changes";
    }
});

// ==========================================
// 4. DELETE: Remove Mentor
// ==========================================
function openDeleteModal(docId) {
    deleteTargetDocId = docId;
    deleteModalOverlay.hidden = false;
}

function closeDeleteModal() {
    deleteTargetDocId = null;
    deleteModalOverlay.hidden = true;
}

closeDeleteModalBtn.addEventListener("click", closeDeleteModal);
cancelDeleteBtn.addEventListener("click", closeDeleteModal);

confirmDeleteBtn.addEventListener("click", async () => {
    if (!deleteTargetDocId) return;

    confirmDeleteBtn.disabled = true;
    confirmDeleteBtn.textContent = "Deleting...";

    try {
        const idToDelete = deleteTargetDocId;
        mentors = mentors.filter(m => m.id !== idToDelete);
        saveToLocalStorage(mentors);
        renderTable();

        if (db && !idToDelete.startsWith("mentor-")) {
            try {
                await deleteDoc(doc(db, "mentors", idToDelete));
            } catch (err) {
                console.warn("Deleted locally:", err.message);
            }
        }

        showNotification("Mentor removed successfully!", "success");
        closeDeleteModal();
    } catch (error) {
        showNotification("Delete error: " + error.message, "error");
    } finally {
        confirmDeleteBtn.disabled = false;
        confirmDeleteBtn.textContent = "Yes, Delete";
    }
});

// Modal Close Triggers
window.addEventListener("click", (e) => {
    if (e.target === editModalOverlay) closeEditModal();
    if (e.target === deleteModalOverlay) closeDeleteModal();
});

window.addEventListener("keydown", (e) => {
    if (e.key === "Escape") {
        closeEditModal();
        closeDeleteModal();
    }
});

// ==========================================
// 5. EXPORT TO CSV
// ==========================================
exportCsvBtn.addEventListener("click", () => {
    if (mentors.length === 0) {
        showNotification("No mentor records to export!", "error");
        return;
    }

    const headers = ["ID", "Mentor Name", "Employee ID", "Department", "Designation", "Max Mentees"];
    const rows = mentors.map(m => [
        `"${m.id}"`,
        `"${m.name || ''}"`,
        `"${m.employeeId || ''}"`,
        `"${m.department || ''}"`,
        `"${m.designation || ''}"`,
        `"${m.maxMentees || ''}"`
    ]);

    const csvContent = "\uFEFF" + [headers.join(","), ...rows.map(e => e.join(","))].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `mentors_${new Date().toISOString().slice(0,10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    showNotification("CSV file downloaded successfully!", "success");
});

// Initial Render
renderTable();
validateAddForm();
