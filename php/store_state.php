<?php
$servername = "mysql";
$username = "db367545_109"; // Change to your MySQL username
$password = "umnPft.S3Weh"; // Change to your MySQL password
$dbname = "db367545_109";

// Create connection
$conn = new mysqli($servername, $username, $password, $dbname);

// Check connection
if ($conn->connect_error) {
    die("Connection failed: " . $conn->connect_error);
}

$data = json_decode(file_get_contents('php://input'), true);

$state = $data['state'];
$score = $data['score'];

$sql = "INSERT INTO game_states (state, score) VALUES ('$state', $score) ON DUPLICATE KEY UPDATE score=$score";

if ($conn->query($sql) === TRUE) {
    echo json_encode(["status" => "success"]);
} else {
    echo json_encode(["status" => "error", "message" => $conn->error]);
}

$conn->close();
?>
