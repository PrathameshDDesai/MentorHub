# 🎓 MentorHub - Mentor Management System
     
A web-based Mentor Management System built with **HTML5**, **CSS3**, **JavaScript (ES6+)**, **Firebase (Google Authentication & Firestore Cloud Database)**, and an alternate **PHP + MySQL Backend**.

---

## 🚀 Features

- **Google Authentication**: One-click Google Login and profile management using Firebase Authentication.
- **Mentor Registration**: Add mentors with name, employee ID, department, designation, max mentees capacity, and profile photo upload.
- **Form Validation**:
  - Real-time inline field validation.
  - Profile photo format check (JPG / PNG).
  - Positive whole number validation for maximum mentees allowed.
  - Disabled submit button until all fields meet validation rules.
- **Dynamic Table**: Live table rendering with photo avatars and action controls.
- **Edit Modal Dialog**: Centered modal popup pre-populated with row details for updating records.
- **Delete Confirmation Modal**: Safe deletion dialog asking for confirmation before permanently removing records.
- **Cloud Database (Firebase Firestore)**: Real-time cloud synchronization and persistent storage.
- **PHP + MySQL Backend (XAMPP)**: Dedicated PDO database scripts and REST API endpoints (`database.sql`, `db.php`, `api.php`).
- **Data Export**: One-click **Export to .CSV** button to download all mentor records into an Excel-ready spreadsheet.

---

## 🛠️ Tech Stack

- **Frontend**: HTML5, Vanilla CSS3 (Custom Responsive Layout & Modals), JavaScript ES6+ (Modular Firebase SDK)
- **Cloud Database & Auth**: Google Firebase Auth (Google Provider), Firebase Firestore
- **Local Database (Optional)**: PHP 8.x, MySQL (PDO Prepared Statements), XAMPP
- **Data Format**: JSON, Multipart Form-Data, CSV

---

## 📂 Project Structure

```text
├── index.html          # Main application page
├── style.css           # Styling for Navbar, Cards, Form validation, and Modals
├── script.js           # Frontend logic, Firebase Auth & Firestore CRUD operations
├── firebase-config.js  # Firebase project credentials
├── database.sql        # MySQL schema and database creation script
├── db.php              # PHP MySQL PDO connection with prepared statements
├── api.php             # PHP REST API for CRUD actions
├── export_csv.php      # CSV export handler
├── uploads/            # Server uploads folder
└── README.md           # Project documentation
```

---

## 💻 How to Run Locally

### Option 1: Live Server / Python HTTP Server (Firebase Cloud DB)
```bash
# Start a local web server in the project directory
python -m http.server 3000
```
Open **`http://localhost:3000/index.html`** in your browser.

### Option 2: XAMPP (PHP + MySQL)
1. Copy the folder to `C:\xampp\htdocs\MentorHub`.
2. Start **Apache** and **MySQL** in XAMPP Control Panel.
3. Import `database.sql` into **phpMyAdmin** (`http://localhost/phpmyadmin`).
4. Open **`http://localhost/MentorHub/index.html`** in your browser.
