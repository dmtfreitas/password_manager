<?php

header('Content-Type: application/json; charset=utf-8');
require_once 'includes/config.php';

const CAMPOS_SISTEMA    = ['NOME_SISTEMA', 'TIPO_SISTEMA', 'PROTOCOLO_SERVICO', 'PORTA', 'LINK', 'DESCRICAO'];
const CAMPOS_CREDENCIAL = ['ID_SISTEMA', 'TIPO', 'TIPO_SGBD', 'HOST', 'DATABASE_NAME', 'USUARIO', 'SENHA', 'OBSERVACAO'];

$action = $_GET['action'] ?? '';
$input  = json_decode(file_get_contents('php://input'), true);
if (!is_array($input)) $input = [];

try {

    switch ($action) {
        case 'listar':             listar();                  break;
        case 'salvar_sistema':     salvarSistema($input);     break;
        case 'excluir_sistema':    excluirSistema($input);    break;
        case 'salvar_credencial':  salvarCredencial($input);  break;
        case 'excluir_credencial': excluirCredencial($input); break;
        default:
            echo json_encode(['error' => 'Ação inválida!']);
    }

} catch (Exception $error) {
    http_response_code(500);
    echo json_encode(['error' => $error->getMessage()]);
}

function filtrarCampos(array $dados, array $whitelist) {
    $out = [];
    foreach ($whitelist as $campo) {
        $valor = $dados[$campo] ?? null;
        if (is_string($valor)) $valor = trim($valor);
        $out[$campo] = ($valor === '' ? null : $valor);
    }
    return $out;
}

function credenciaisPorSistema(PDO $pdo, array $idsSistemas) {
    if (empty($idsSistemas)) return [];

    $placeholders = implode(',', array_fill(0, count($idsSistemas), '?'));
    $stmt = $pdo->prepare("SELECT * FROM CREDENCIAIS WHERE ID_SISTEMA IN ($placeholders) ORDER BY TIPO, ID");
    $stmt->execute(array_values($idsSistemas));

    $agrupado = [];
    foreach ($stmt->fetchAll() as $cred) {
        $agrupado[$cred['ID_SISTEMA']][] = $cred;
    }
    return $agrupado;
}

function listar() {

    $pdo  = getDB();
    $term = trim($_GET['term'] ?? '');

    $sql    = "SELECT s.* FROM SISTEMAS s";
    $params = [];

    if ($term !== '') {

        $camposSistema    = ['s.NOME_SISTEMA', 's.TIPO_SISTEMA', 's.LINK', 's.DESCRICAO', 's.PROTOCOLO_SERVICO'];
        $camposCredencial = ['c.TIPO', 'c.TIPO_SGBD', 'c.HOST', 'c.DATABASE_NAME', 'c.USUARIO', 'c.OBSERVACAO'];

        $condS = [];
        foreach ($camposSistema as $i => $campo) {
            $condS[] = "$campo LIKE :s$i";
            $params[":s$i"] = "%$term%";
        }

        $condC = [];
        foreach ($camposCredencial as $i => $campo) {
            $condC[] = "$campo LIKE :c$i";
            $params[":c$i"] = "%$term%";
        }

        $sql .= " WHERE (" . implode(' OR ', $condS) . ")
                  OR EXISTS (
                      SELECT 1 FROM CREDENCIAIS c
                      WHERE c.ID_SISTEMA = s.ID
                        AND (" . implode(' OR ', $condC) . ")
                  )";
    }

    $sql .= " ORDER BY s.NOME_SISTEMA";

    $stmt = $pdo->prepare($sql);
    $stmt->execute($params);
    $sistemas = $stmt->fetchAll();

    $credenciais = credenciaisPorSistema($pdo, array_column($sistemas, 'ID'));

    foreach ($sistemas as &$sistema) {
        $sistema['credenciais'] = $credenciais[$sistema['ID']] ?? [];
    }
    unset($sistema);

    echo json_encode($sistemas);
}

function salvarSistema($input) {

    $pdo   = getDB();
    $dados = filtrarCampos($input, CAMPOS_SISTEMA);

    if ($dados['NOME_SISTEMA'] === null) {
        echo json_encode(['error' => 'O nome do sistema é obrigatório.']);
        return;
    }

    if ($dados['PORTA'] !== null) $dados['PORTA'] = (int)$dados['PORTA'];

    if (!empty($input['ID'])) {

        $set = implode(', ', array_map(fn($c) => "$c = :$c", CAMPOS_SISTEMA));
        $dados['ID'] = (int)$input['ID'];

        $stmt = $pdo->prepare("UPDATE SISTEMAS SET $set WHERE ID = :ID");
        $stmt->execute($dados);

        echo json_encode(['ok' => true, 'id' => $dados['ID']]);

    } else {

        $colunas      = implode(', ', CAMPOS_SISTEMA);
        $placeholders = implode(', ', array_map(fn($c) => ":$c", CAMPOS_SISTEMA));

        $stmt = $pdo->prepare("INSERT INTO SISTEMAS ($colunas) VALUES ($placeholders)");
        $stmt->execute($dados);

        echo json_encode(['ok' => true, 'id' => (int)$pdo->lastInsertId()]);
    }
}

function excluirSistema($input) {

    $id = (int)($input['ID'] ?? 0);
    if ($id <= 0) {
        echo json_encode(['error' => 'ID inválido.']);
        return;
    }

    // ON DELETE CASCADE apaga também todas as credenciais do sistema
    $stmt = getDB()->prepare("DELETE FROM SISTEMAS WHERE ID = ?");
    $stmt->execute([$id]);

    echo json_encode(['ok' => true]);
}

function salvarCredencial($input) {

    $pdo   = getDB();
    $dados = filtrarCampos($input, CAMPOS_CREDENCIAL);

    if (empty($dados['ID_SISTEMA']) || $dados['TIPO'] === null) {
        echo json_encode(['error' => 'Sistema e tipo da credencial são obrigatórios.']);
        return;
    }

    $dados['ID_SISTEMA'] = (int)$dados['ID_SISTEMA'];
    $dados['TIPO']       = strtolower($dados['TIPO']);

    if (!empty($input['ID'])) {

        $set = implode(', ', array_map(fn($c) => "$c = :$c", CAMPOS_CREDENCIAL));
        $dados['ID'] = (int)$input['ID'];

        $stmt = $pdo->prepare("UPDATE CREDENCIAIS SET $set WHERE ID = :ID");
        $stmt->execute($dados);

        echo json_encode(['ok' => true, 'id' => $dados['ID']]);

    } else {

        $colunas      = implode(', ', CAMPOS_CREDENCIAL);
        $placeholders = implode(', ', array_map(fn($c) => ":$c", CAMPOS_CREDENCIAL));

        $stmt = $pdo->prepare("INSERT INTO CREDENCIAIS ($colunas) VALUES ($placeholders)");
        $stmt->execute($dados);

        echo json_encode(['ok' => true, 'id' => (int)$pdo->lastInsertId()]);
    }
}

function excluirCredencial($input) {

    $id = (int)($input['ID'] ?? 0);
    if ($id <= 0) {
        echo json_encode(['error' => 'ID inválido.']);
        return;
    }

    $stmt = getDB()->prepare("DELETE FROM CREDENCIAIS WHERE ID = ?");
    $stmt->execute([$id]);

    echo json_encode(['ok' => true]);
}

?>