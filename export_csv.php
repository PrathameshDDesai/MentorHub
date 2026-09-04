<?php
// export_csv.php - Export all mentors to a downloadable CSV file
require_once 'db.php';

try {
    $stmt = $pdo->prepare("SELECT id, name, employee_id, department, designation, max_mentees, photo_path, created_at FROM mentors ORDER BY id ASC");
    $stmt->execute();
    $mentors = $stmt->fetchAll();

    // Set download headers
    $filename = "mentors_export_" . date("Ymd_His") . ".csv";
    header('Content-Type: text/csv; charset=utf-8');
    header('Content-Disposition: attachment; filename="' . $filename . '"');

    // Open PHP output stream
    $output = fopen('php://output', 'w');

    // Add UTF-8 BOM for Excel compatibility
    fputs($output, "\xEF\xBB\xBF");

    // CSV Column Headers
    fputcsv($output, ['ID', 'Mentor Name', 'Employee ID', 'Department', 'Designation', 'Max Mentees', 'Photo Path', 'Created At']);

    // CSV Rows
    foreach ($mentors as $mentor) {
        fputcsv($output, [
            $mentor['id'],
            $mentor['name'],
            $mentor['employee_id'],
            $mentor['department'],
            $mentor['designation'],
            $mentor['max_mentees'],
            $mentor['photo_path'],
            $mentor['created_at']
        ]);
    }

    fclose($output);
    exit;

} catch (Exception $e) {
    echo "Error generating CSV export file.";
    exit;
}
