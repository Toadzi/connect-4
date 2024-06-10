<?php
$servername = "mysql";
$username = "db367545_109";
$password = "umnPft.S3Weh";
$dbname = "db367545_109";

// Create connection
$conn = new mysqli($servername, $username, $password, $dbname);

// Check connection
if ($conn->connect_error) {
    die("Connection failed: " . $conn->connect_error);
}

$sql = "INSERT INTO games (winner) VALUES (NULL)";

if ($conn->query($sql) === TRUE) {
    $game_id = $conn->insert_id;
    echo json_encode(["status" => "success", "game_id" => $game_id]);
} else {
    echo json_encode(["status" => "error", "message" => $conn->error]);
}

$conn->close();
?>
