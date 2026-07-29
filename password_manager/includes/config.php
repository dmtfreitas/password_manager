<?php

define('DB_HOST', 'localhost');
define('DB_PORT', '3307');
define('DB_NAME', 'BASE_DE_SENHAS');
define('DB_USER', 'root');
define('DB_PASS', '');
define('DB_CHARSET', 'utf8mb4');

function getDB() {

    static $pdo = null;

    if ($pdo === null) {

        try {

            $dsn = "mysql:host=" . DB_HOST . ";port=" . DB_PORT . ";dbname=" . DB_NAME . ";charset=" . DB_CHARSET;

            $options = [
                PDO::ATTR_ERRMODE            => PDO::ERRMODE_EXCEPTION,
                PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
                PDO::ATTR_EMULATE_PREPARES   => false,
            ];

            $pdo = new PDO($dsn, DB_USER, DB_PASS, $options);

        } catch (PDOException $error) {
            http_response_code(500);
            header('Content-Type: application/json; charset=utf-8');
            die(json_encode(['error' => 'Error connection: ' . $error->getMessage()]));
        }

    }

    return $pdo;

}