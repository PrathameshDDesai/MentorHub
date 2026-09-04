<?php
// api.php - Backend API for Mentor Operations (Task 3)
header('Content-Type: application/json');
require_once 'db.php';

// Helper function to send friendly JSON response
function sendResponse($success, $message, $data = null) {
    echo json_encode([
        'success' => $success,
        'message' => $message,
        'data' => $data
    ]);
    exit;
}

// Upload directory setup
$uploadDir = __DIR__ . DIRECTORY_SEPARATOR . 'uploads' . DIRECTORY_SEPARATOR;
if (!is_dir($uploadDir)) {
    mkdir($uploadDir, 0777, true);
}

// Determine Action
$action = $_GET['action'] ?? ($_POST['action'] ?? '');

switch ($action) {

    // =========================================================================
    // 1. READ: Fetch all mentors from MySQL Database
    // =========================================================================
    case 'read':
        try {
            $stmt = $pdo->prepare("SELECT id, name, employee_id, department, designation, max_mentees, photo_path FROM mentors ORDER BY id DESC");
            $stmt->execute();
            $mentors = $stmt->fetchAll();
            sendResponse(true, 'Mentors fetched successfully.', $mentors);
        } catch (Exception $e) {
            sendResponse(false, 'Failed to retrieve mentor records.');
        }
        break;

    // =========================================================================
    // 2. CREATE: Add new mentor with unique photo upload
    // =========================================================================
    case 'create':
        if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
            sendResponse(false, 'Invalid request method.');
        }

        $name = trim($_POST['mentorName'] ?? '');
        $employeeId = trim($_POST['employeeId'] ?? '');
        $department = trim($_POST['department'] ?? '');
        $designation = trim($_POST['designation'] ?? '');
        $maxMentees = filter_var($_POST['maxMentees'] ?? '', FILTER_VALIDATE_INT);

        // Server-side validation
        if ($name === '') {
            sendResponse(false, 'Mentor Name cannot be empty.');
        }
        if ($employeeId === '') {
            sendResponse(false, 'Employee ID cannot be empty.');
        }
        if ($department === '') {
            sendResponse(false, 'Please select a valid Department.');
        }
        if ($designation === '') {
            sendResponse(false, 'Designation cannot be empty.');
        }
        if ($maxMentees === false || $maxMentees <= 0) {
            sendResponse(false, 'Maximum Mentees Allowed must be a positive whole number.');
        }

        // Check if Employee ID already exists (Prepared Statement)
        try {
            $checkStmt = $pdo->prepare("SELECT id FROM mentors WHERE employee_id = :employee_id LIMIT 1");
            $checkStmt->execute([':employee_id' => $employeeId]);
            if ($checkStmt->fetch()) {
                sendResponse(false, 'A mentor with this Employee ID already exists.');
            }
        } catch (Exception $e) {
            sendResponse(false, 'Error checking duplicate employee ID.');
        }

        // Validate Profile Photo Upload
        if (!isset($_FILES['profilePhoto']) || $_FILES['profilePhoto']['error'] !== UPLOAD_ERR_OK) {
            sendResponse(false, 'Profile photo is required.');
        }

        $file = $_FILES['profilePhoto'];
        $allowedExts = ['jpg', 'jpeg', 'png'];
        $fileExt = strtolower(pathinfo($file['name'], PATHINFO_EXTENSION));

        // Validate image extension and MIME type
        $finfo = finfo_open(FILEINFO_MIME_TYPE);
        $mimeType = finfo_file($finfo, $file['tmp_name']);
        finfo_close($finfo);

        $allowedMimes = ['image/jpeg', 'image/png', 'image/pjpeg'];

        if (!in_array($fileExt, $allowedExts) || !in_array($mimeType, $allowedMimes)) {
            sendResponse(false, 'Only JPG and PNG images are allowed.');
        }

        // Generate unique file name (combining cleaned emp ID, timestamp, and random token)
        $cleanEmpId = preg_replace('/[^a-zA-Z0-9]/', '', $employeeId);
        $uniqueFileName = $cleanEmpId . '_' . time() . '_' . mt_rand(1000, 9999) . '.' . $fileExt;
        $targetFilePath = $uploadDir . $uniqueFileName;
        $dbPhotoPath = 'uploads/' . $uniqueFileName;

        if (!move_uploaded_file($file['tmp_name'], $targetFilePath)) {
            sendResponse(false, 'Failed to save the uploaded profile photo on the server.');
        }

        // Insert into Database using Prepared Statements
        try {
            $sql = "INSERT INTO mentors (name, employee_id, department, designation, max_mentees, photo_path) 
                    VALUES (:name, :employee_id, :department, :designation, :max_mentees, :photo_path)";
            $stmt = $pdo->prepare($sql);
            $stmt->execute([
                ':name' => $name,
                ':employee_id' => $employeeId,
                ':department' => $department,
                ':designation' => $designation,
                ':max_mentees' => $maxMentees,
                ':photo_path' => $dbPhotoPath
            ]);

            sendResponse(true, 'Mentor registered successfully!');
        } catch (Exception $e) {
            // Delete uploaded file if SQL insert fails
            if (file_exists($targetFilePath)) {
                unlink($targetFilePath);
            }
            sendResponse(false, 'Database error: Unable to save mentor record.');
        }
        break;

    // =========================================================================
    // 3. UPDATE: Update mentor details in database
    // =========================================================================
    case 'update':
        if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
            sendResponse(false, 'Invalid request method.');
        }

        $id = filter_var($_POST['editIndex'] ?? '', FILTER_VALIDATE_INT);
        $name = trim($_POST['editMentorName'] ?? '');
        $employeeId = trim($_POST['editEmployeeId'] ?? '');
        $department = trim($_POST['editDepartment'] ?? '');
        $designation = trim($_POST['editDesignation'] ?? '');
        $maxMentees = filter_var($_POST['editMaxMentees'] ?? '', FILTER_VALIDATE_INT);

        if ($id === false || $id <= 0) {
            sendResponse(false, 'Invalid mentor ID provided.');
        }
        if ($name === '') {
            sendResponse(false, 'Mentor Name cannot be empty.');
        }
        if ($employeeId === '') {
            sendResponse(false, 'Employee ID cannot be empty.');
        }
        if ($department === '') {
            sendResponse(false, 'Please select a valid Department.');
        }
        if ($designation === '') {
            sendResponse(false, 'Designation cannot be empty.');
        }
        if ($maxMentees === false || $maxMentees <= 0) {
            sendResponse(false, 'Maximum Mentees Allowed must be a positive whole number.');
        }

        // Fetch current mentor record
        try {
            $fetchStmt = $pdo->prepare("SELECT photo_path FROM mentors WHERE id = :id LIMIT 1");
            $fetchStmt->execute([':id' => $id]);
            $currentRecord = $fetchStmt->fetch();

            if (!$currentRecord) {
                sendResponse(false, 'Mentor record not found.');
            }
        } catch (Exception $e) {
            sendResponse(false, 'Database error while locating mentor record.');
        }

        // Check for duplicate employee ID excluding current record
        try {
            $checkDup = $pdo->prepare("SELECT id FROM mentors WHERE employee_id = :employee_id AND id != :id LIMIT 1");
            $checkDup->execute([':employee_id' => $employeeId, ':id' => $id]);
            if ($checkDup->fetch()) {
                sendResponse(false, 'Another mentor is already registered with this Employee ID.');
            }
        } catch (Exception $e) {
            sendResponse(false, 'Error checking duplicate employee ID.');
        }

        $dbPhotoPath = $currentRecord['photo_path'];

        // Handle optional photo update
        if (isset($_FILES['editProfilePhoto']) && $_FILES['editProfilePhoto']['error'] === UPLOAD_ERR_OK) {
            $file = $_FILES['editProfilePhoto'];
            $allowedExts = ['jpg', 'jpeg', 'png'];
            $fileExt = strtolower(pathinfo($file['name'], PATHINFO_EXTENSION));

            $finfo = finfo_open(FILEINFO_MIME_TYPE);
            $mimeType = finfo_file($finfo, $file['tmp_name']);
            finfo_close($finfo);

            $allowedMimes = ['image/jpeg', 'image/png', 'image/pjpeg'];

            if (!in_array($fileExt, $allowedExts) || !in_array($mimeType, $allowedMimes)) {
                sendResponse(false, 'Updated photo must be a valid JPG or PNG image.');
            }

            $cleanEmpId = preg_replace('/[^a-zA-Z0-9]/', '', $employeeId);
            $uniqueFileName = $cleanEmpId . '_' . time() . '_' . mt_rand(1000, 9999) . '.' . $fileExt;
            $targetFilePath = $uploadDir . $uniqueFileName;

            if (move_uploaded_file($file['tmp_name'], $targetFilePath)) {
                // Delete old photo file if exists
                $oldFile = __DIR__ . DIRECTORY_SEPARATOR . str_replace('/', DIRECTORY_SEPARATOR, $currentRecord['photo_path']);
                if (file_exists($oldFile) && is_file($oldFile)) {
                    @unlink($oldFile);
                }
                $dbPhotoPath = 'uploads/' . $uniqueFileName;
            }
        }

        // Execute Update using Prepared Statements
        try {
            $updateSql = "UPDATE mentors 
                          SET name = :name, employee_id = :employee_id, department = :department, 
                              designation = :designation, max_mentees = :max_mentees, photo_path = :photo_path 
                          WHERE id = :id";
            $updateStmt = $pdo->prepare($updateSql);
            $updateStmt->execute([
                ':name' => $name,
                ':employee_id' => $employeeId,
                ':department' => $department,
                ':designation' => $designation,
                ':max_mentees' => $maxMentees,
                ':photo_path' => $dbPhotoPath,
                ':id' => $id
            ]);

            sendResponse(true, 'Mentor details updated successfully!');
        } catch (Exception $e) {
            sendResponse(false, 'Database error: Unable to update mentor record.');
        }
        break;

    // =========================================================================
    // 4. DELETE: Delete mentor from MySQL Database
    // =========================================================================
    case 'delete':
        if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
            sendResponse(false, 'Invalid request method.');
        }

        $id = filter_var($_POST['id'] ?? '', FILTER_VALIDATE_INT);

        if ($id === false || $id <= 0) {
            sendResponse(false, 'Invalid mentor ID.');
        }

        try {
            // Find photo path first to clean up stored image
            $findStmt = $pdo->prepare("SELECT photo_path FROM mentors WHERE id = :id LIMIT 1");
            $findStmt->execute([':id' => $id]);
            $mentor = $findStmt->fetch();

            if ($mentor) {
                // Delete record using prepared statement
                $delStmt = $pdo->prepare("DELETE FROM mentors WHERE id = :id");
                $delStmt->execute([':id' => $id]);

                // Remove image from uploads folder
                $filePath = __DIR__ . DIRECTORY_SEPARATOR . str_replace('/', DIRECTORY_SEPARATOR, $mentor['photo_path']);
                if (file_exists($filePath) && is_file($filePath)) {
                    @unlink($filePath);
                }

                sendResponse(true, 'Mentor removed successfully.');
            } else {
                sendResponse(false, 'Mentor not found.');
            }
        } catch (Exception $e) {
            sendResponse(false, 'Database error: Unable to delete mentor.');
        }
        break;

    default:
        sendResponse(false, 'Unknown API action requested.');
        break;
}
