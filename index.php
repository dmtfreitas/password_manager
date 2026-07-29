<!DOCTYPE html>
<html lang="pt-BR">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Gerenciador de Senhas</title>
    <link rel="stylesheet" href="css/style.css">
</head>
<body>
    <div class="container">
        <div class="header">
            <div class="header-text">
                <h1>Gerenciador de Senhas</h1>
                <p>Sistema de Gerenciamento de Credenciais e Acessos!</p>
            </div>
            <div class="header-actions">
                <div class="config-menu" id="configMenu">
                    <button class="btn-header" id="configBtn" onclick="toggleConfigMenu(event)">
                        <span class="config-icon">&#9881;</span> Config
                    </button>
                    <div class="config-dropdown" id="configDropdown">
                        <button class="config-item" onclick="menuAction('credencial')">
                            <span class="config-item-icon">&#43;</span>
                            <span>
                                <strong>New Credential</strong>
                                <small>Cadastra e configura novos acessos!</small>
                            </span>
                        </button>
                        <button class="config-item" onclick="menuAction('sistema')">
                            <span class="config-item-icon">&#43;</span>
                            <span>
                                <strong>New System</strong>
                                <small>Cria e configura um novo sistema!</small>
                            </span>
                        </button>
                        <div class="config-divider"></div>
                        <button class="config-item" onclick="menuAction('recarregar')">
                            <span class="config-item-icon">&#8635;</span>
                            <span>
                                <strong>Reload data</strong>
                                <small>Carrega novamente os dados do banco!</small>
                            </span>
                        </button>
                        <div class="config-note">
                            Edição e exclusão, use os botões Editar ou + Credencial listada abaixo...
                        </div>
                    </div>
                </div>
            </div>
        </div>
        <div class="search-section">
            <input
                type="text" id="searchInput" class="search-box"
                placeholder="Digite para pesquisar em todos os campos ou tipos (sistema, host, usuário, senha, URL, descrição...)"
                autocomplete="off">
        </div>
        <div class="filter-section" id="filterSection">
        </div>
        <div class="results-info" id="resultsInfo">Carregando...</div>
        <div class="results-container" id="results">
            <div class="loading">Carregando dados...</div>
        </div>
    </div>
    <div class="modal-overlay" id="modalSistema">
        <div class="modal">
            <div class="modal-header">
                <h2 id="modalSistemaTitle">New System</h2>
                <button class="modal-close" onclick="closeModal('modalSistema')">&times;</button>
            </div>
            <div class="modal-body">
                <input type="hidden" id="sisId">
                <div class="form-group">
                    <label for="sisNome">Nome do Sistema *</label>
                    <input type="text" id="sisNome" placeholder="Ex: Portal Embarques">
                </div>
                <div class="form-row">
                    <div class="form-group">
                        <label for="sisTipo">Tipo Sistema</label>
                        <input type="text" id="sisTipo" list="listaTiposSistema" placeholder="Ex: WEB, DATABASE, RDP">
                        <datalist id="listaTiposSistema"></datalist>
                    </div>
                    <div class="form-group">
                        <label for="sisProtocolo">Protocolo / Serviço</label>
                        <input type="text" id="sisProtocolo" placeholder="Ex: HTTPS, SFTP">
                    </div>
                </div>
                <div class="form-row">
                    <div class="form-group">
                        <label for="sisPorta">Porta</label>
                        <input type="number" id="sisPorta" placeholder="Ex: 3306">
                    </div>
                    <div class="form-group">
                        <label for="sisLink">Link</label>
                        <input type="text" id="sisLink" placeholder="https://...">
                    </div>
                </div>
                <div class="form-group">
                    <label for="sisDescricao">Descrição</label>
                    <textarea id="sisDescricao" rows="3" placeholder="Anotações sobre o sistema"></textarea>
                </div>
            </div>
            <div class="modal-footer">
                <button class="btn-danger-ghost" id="sisExcluir" onclick="deleteSystemFromModal()">Excluir</button>
                <span class="footer-spacer"></span>
                <button class="btn-secondary" onclick="closeModal('modalSistema')">Cancelar</button>
                <button class="btn-primary" onclick="saveSystem()">Salvar</button>
            </div>
        </div>
    </div>
    <div class="modal-overlay" id="modalCredencial">
        <div class="modal modal-lg">
            <div class="modal-header">
                <h2 id="modalCredencialTitle">New Credential</h2>
                <button class="modal-close" onclick="closeModal('modalCredencial')">&times;</button>
            </div>
            <div class="modal-body">
                <input type="hidden" id="credId">
                <div class="form-section">
                    <div class="form-section-title">1. Sistema</div>
                    <div class="segmented" id="credModoSistema">
                        <button type="button" class="seg-btn active" data-modo="existente"
                            onclick="setCredSystemMode('existente', this)">Existing System</button>
                        <button type="button" class="seg-btn" data-modo="novo"
                            onclick="setCredSystemMode('novo', this)">New System</button>
                    </div>
                    <div id="credSistemaExistente">
                        <div class="system-picker">
                            <input type="text" id="credSistemaBusca"
                                placeholder="Digite para buscar o sistema..." autocomplete="off">
                            <div class="picker-dropdown" id="credSistemaLista"></div>
                        </div>
                    </div>
                    <div id="credSistemaNovo" style="display:none;">
                        <input type="text" id="credNovoSistema" class="input-solo"
                            placeholder="Nome do novo sistema que será criado..." autocomplete="off">
                    </div>
                </div>
                <div class="form-section">
                    <div class="form-section-title">2. Tipo de Credencial</div>
                    <div class="type-pills" id="credTipoPills"></div>
                </div>
                <div class="form-section">
                    <div class="form-section-title">3. Dados de Acesso</div>
                    <div id="credFields"></div>
                </div>
            </div>
            <div class="modal-footer">
                <button class="btn-danger-ghost" id="credExcluir" onclick="deleteCredentialFromModal()">Excluir</button>
                <span class="footer-spacer"></span>
                <button class="btn-secondary" onclick="closeModal('modalCredencial')">Cancelar</button>
                <button class="btn-primary" onclick="saveCredential()">Salvar</button>
            </div>
        </div>
    </div>
    <div id="toast" class="toast"></div>
    <script src="js/app.js"></script>
</body>
</html>
