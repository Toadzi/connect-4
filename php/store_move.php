<?php
$servername = "mysql";
$username = "db367545_109"; // Change to your MySQL username
$password = "umnPft.S3Weh"; // Change to your MySQL password
$dbname = "db367545_109";

/// Set response header for JSON
header('Content-Type: application/json');

// Start output buffering to capture any unexpected output
ob_start();
file_put_contents('php_debug.log', "Script started\n", FILE_APPEND);

// Create connection
$conn = new mysqli($servername, $username, $password, $dbname);

// Check connection
if ($conn->connect_error) {
    $output = ob_get_clean();
    file_put_contents('php_debug.log', "Connection failed: " . $conn->connect_error . "\n", FILE_APPEND);
    echo json_encode(["status" => "error", "message" => "Connection failed: " . $conn->connect_error]);
    exit();
}

$data = json_decode(file_get_contents('php://input'), true);
file_put_contents('php_debug.log', "Input data: " . print_r($data, true), FILE_APPEND);

// Validate input data
if (!isset($data['game_id']) || !isset($data['player']) || !isset($data['col']) || !isset($data['row']) || !isset($data['moveNumber'])) {
    $output = ob_get_clean();
    file_put_contents('php_debug.log', "Invalid input data\n", FILE_APPEND);
    echo json_encode(["status" => "error", "message" => "Invalid input data"]);
    exit();
}

$game_id = $data['game_id'];
$player = $data['player'];
$col = $data['col'];
$row = $data['row'];
$move_number = $data['moveNumber'];

// Prepare and bind
$stmt = $conn->prepare("INSERT INTO move_history (game_id, player, col, row, move_number) VALUES (?, ?, ?, ?, ?)");
$stmt->bind_param("isiii", $game_id, $player, $col, $row, $move_number);

if ($stmt->execute() === TRUE) {
    $response = ["status" => "success"];
    file_put_contents('php_debug.log', "Move stored successfully\n", FILE_APPEND);
} else {
    $response = ["status" => "error", "message" => $stmt->error];
    file_put_contents('php_debug.log', "Error storing move: " . $stmt->error . "\n", FILE_APPEND);
}

$stmt->close();
$conn->close();

// Capture any unexpected output
$output = ob_get_clean();
file_put_contents('php_debug.log', "Output: $output\n", FILE_APPEND);

// Log unexpected output if there is any
if (!empty($output)) {
    file_put_contents('php_debug.log', "Unexpected output: $output\n", FILE_APPEND);
}

// Return the JSON response
echo json_encode($response);
?>
