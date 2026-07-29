const CREDENTIAL_TYPES = {
    database: {
        label: 'Database',
        color: '#10b981',
        fields: [
            { name: 'TIPO_SGBD',     label: 'Tipo SGBD' },
            { name: 'HOST',          label: 'Host' },
            { name: 'DATABASE_NAME', label: 'Database' },
            { name: 'USUARIO',       label: 'Usuário' },
            { name: 'SENHA',         label: 'Senha', password: true },
            { name: 'OBSERVACAO',    label: 'Observação', textarea: true }
        ]
    },
    ftp: {
        label: 'FTP',
        color: '#f59e0b',
        fields: [
            { name: 'HOST',       label: 'Host' },
            { name: 'USUARIO',    label: 'Usuário' },
            { name: 'SENHA',      label: 'Senha', password: true },
            { name: 'OBSERVACAO', label: 'Observação', textarea: true }
        ]
    },
    rdp: {
        label: 'RDP',
        color: '#8b5cf6',
        fields: [
            { name: 'HOST',       label: 'Host' },
            { name: 'USUARIO',    label: 'Usuário' },
            { name: 'SENHA',      label: 'Senha', password: true },
            { name: 'OBSERVACAO', label: 'Observação', textarea: true }
        ]
    },
    web: {
        label: 'Web',
        color: '#3b82f6',
        fields: [
            { name: 'USUARIO',    label: 'Email / Usuário' },
            { name: 'SENHA',      label: 'Senha', password: true },
            { name: 'OBSERVACAO', label: 'Observação', textarea: true }
        ]
    }
};

const DEFAULT_TYPE = {
    color: '#64748b',
    fields: [
        { name: 'TIPO_SGBD',     label: 'Tipo SGBD' },
        { name: 'HOST',          label: 'Host' },
        { name: 'DATABASE_NAME', label: 'Database' },
        { name: 'USUARIO',       label: 'Usuário' },
        { name: 'SENHA',         label: 'Senha', password: true },
        { name: 'OBSERVACAO',    label: 'Observação', textarea: true }
    ]
};

let allSystems      = [];
let currentFilter   = 'all';
let searchTerm      = '';
let searchTimeout   = null;
let credSystemMode  = 'existente';
let currentCredType = 'database';

document.addEventListener('DOMContentLoaded', function () {
    setupSearch();
    setupSystemPickers();
    loadSystems();
});

function esc(value) {
    if (value === null || value === undefined) return '';
    return String(value)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

function typeConfig(tipo) {
    return CREDENTIAL_TYPES[tipo] || {
        label: (tipo || '?').toUpperCase(),
        color: DEFAULT_TYPE.color,
        fields: DEFAULT_TYPE.fields
    };
}

/* Todos os tipos de credencial que realmente existem no banco. */
function tiposEmUso() {
    const contagem = new Map();
    allSystems.forEach(s => (s.credenciais || []).forEach(c => {
        contagem.set(c.TIPO, (contagem.get(c.TIPO) || 0) + 1);
    }));
    return [...contagem.entries()].sort((a, b) => a[0].localeCompare(b[0]));
}

async function api(action, data) {
    const options = data
        ? { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) }
        : { method: 'GET' };

    const response = await fetch('api.php?action=' + encodeURIComponent(action), options);
    const json = await response.json();

    if (json && json.error) throw new Error(json.error);
    return json;
}

function findCredential(id) {
    for (const system of allSystems) {
        const cred = (system.credenciais || []).find(c => String(c.ID) === String(id));
        if (cred) return cred;
    }
    return null;
}

function findSystem(id) {
    return allSystems.find(s => String(s.ID) === String(id)) || null;
}

function loadSystems() {
    const resultsContainer = document.getElementById('results');
    resultsContainer.innerHTML = '<div class="loading">Loading data...</div>';

    return api('listar')
        .then(data => {
            allSystems = Array.isArray(data) ? data : [];
            renderFilterButtons();
            renderSystemTypeOptions();
            filterAndDisplay();
        })
        .catch(error => {
            console.error('Error:', error);
            resultsContainer.innerHTML = '<div class="no-results"><h3>Error loading data...</h3><p>' + esc(error.message) + '</p></div>';
        });
}

function toggleConfigMenu(event) {
    event.stopPropagation();
    document.getElementById('configMenu').classList.toggle('open');
}

function closeConfigMenu() {
    document.getElementById('configMenu').classList.remove('open');
}

function menuAction(acao) {
    closeConfigMenu();
    if (acao === 'credencial')  openCredentialModal();
    if (acao === 'sistema')     openSystemModal();
    if (acao === 'recarregar')  loadSystems().then(() => showToast('Dados repaginados!'));
}

function setupSearch() {
    document.getElementById('searchInput').addEventListener('input', function (e) {
        searchTerm = e.target.value.toLowerCase();
        clearTimeout(searchTimeout);
        searchTimeout = setTimeout(filterAndDisplay, 300);
    });
}

function renderFilterButtons() {
    const section = document.getElementById('filterSection');
    const tipos   = tiposEmUso();
    const total   = tipos.reduce((soma, [, qtd]) => soma + qtd, 0);

    if (currentFilter !== 'all' && !tipos.some(([tipo]) => tipo === currentFilter)) {
        currentFilter = 'all';
    }

    let html = '<span class="filter-label">Filtrar por tipo:</span>';
    html += '<button class="filter-btn all' + (currentFilter === 'all' ? ' active' : '') +
            '" onclick="setFilter(\'all\')">Todos <span class="filter-count">' + total + '</span></button>';

    tipos.forEach(([tipo, qtd]) => {
        const cfg    = typeConfig(tipo);
        const active = currentFilter === tipo ? ' active' : '';
        html += '<button class="filter-btn' + active + '" style="--type-color:' + cfg.color +
                '" onclick="setFilter(\'' + esc(tipo) + '\')">' + esc(cfg.label) +
                ' <span class="filter-count">' + qtd + '</span></button>';
    });

    section.innerHTML = html;
}

function renderSystemTypeOptions() {
    const tipos = [...new Set(allSystems.map(s => s.TIPO_SISTEMA).filter(Boolean))].sort();
    document.getElementById('listaTiposSistema').innerHTML =
        tipos.map(t => `<option value="${esc(t)}"></option>`).join('');
}

function setFilter(tipo) {
    currentFilter = tipo;
    renderFilterButtons();
    filterAndDisplay();
}

function filterAndDisplay() {
    let filtered = allSystems;

    if (searchTerm) {
        filtered = filtered.filter(system => JSON.stringify(system).toLowerCase().includes(searchTerm));
    }

    if (currentFilter !== 'all') {
        filtered = filtered.filter(system => (system.credenciais || []).some(c => c.TIPO === currentFilter));
    }

    displaySystems(filtered);
    updateResultsInfo(filtered.length);
}

function displaySystems(systems) {
    const resultsContainer = document.getElementById('results');

    if (systems.length === 0) {
        resultsContainer.innerHTML = `
            <div class="no-results">
                <h3>Nenhum resultado encontrado!</h3>
                <p>Tente ajustar os filtros ou a busca, ou cadastre um sistema novo em Config...</p>
            </div>
        `;
        return;
    }

    resultsContainer.innerHTML = systems.map(createSystemCard).join('');
}

function updateResultsInfo(count) {
    let text = `${count} sistema(s) encontrado(s)`;
    if (searchTerm) text += ` para "${searchTerm}"`;
    if (currentFilter !== 'all') text += ` com credenciais ${typeConfig(currentFilter).label.toUpperCase()}`;
    document.getElementById('resultsInfo').textContent = text;
}

function createSystemCard(system) {

    let systemInfoHtml = '';

    if (system.LINK) {
        systemInfoHtml += `
            <div class="info-item">
                <div class="info-label">Link</div>
                <div class="info-value">
                    <a href="${esc(system.LINK)}" target="_blank" class="info-link">${esc(system.LINK)}</a>
                </div>
            </div>
        `;
    }

    if (system.PROTOCOLO_SERVICO || system.PORTA) {
        systemInfoHtml += `
            <div class="info-item">
                <div class="info-label">Protocolo / Porta</div>
                <div class="info-value">${esc(system.PROTOCOLO_SERVICO || '')} ${system.PORTA ? ':' + esc(system.PORTA) : ''}</div>
            </div>
        `;
    }

    if (system.DESCRICAO) {
        systemInfoHtml += `
            <div class="info-item">
                <div class="info-label">Descrição</div>
                <div class="info-value">${esc(system.DESCRICAO)}</div>
            </div>
        `;
    }

    const credentials = (system.credenciais || [])
        .filter(c => currentFilter === 'all' || c.TIPO === currentFilter);

    const credentialsHtml = credentials.length
        ? credentials.map(createCredentialBox).join('')
        : '<div class="credentials-empty">Sem credenciais armazenadas!</div>';

    return `
        <div class="system-card">
            <div class="system-header">
                <div>
                    <h3 class="system-title">${esc(system.NOME_SISTEMA)}</h3>
                    ${system.TIPO_SISTEMA ? `<span class="system-type">${esc(system.TIPO_SISTEMA)}</span>` : ''}
                </div>
                <div class="card-actions">
                    <button class="btn-small" onclick="openCredentialModal(null, ${system.ID})">+ Credencial</button>
                    <button class="btn-small" onclick="openSystemModal(${system.ID})">Editar</button>
                </div>
            </div>

            ${systemInfoHtml ? `<div class="system-info">${systemInfoHtml}</div>` : ''}

            <div class="credentials-section">${credentialsHtml}</div>
        </div>
    `;
}

function createCredentialBox(cred) {

    const cfg = typeConfig(cred.TIPO);

    let fieldsHtml = '';
    let passwordHtml = '';

    cfg.fields.forEach(field => {
        const value = cred[field.name];
        if (!value) return;

        if (field.password) {
            passwordHtml += createField(field.label, value, true);
        } else {
            fieldsHtml += createField(field.label, value, false);
        }
    });

    return `
        <div class="credential-box" style="--type-color:${cfg.color}">
            <div class="credential-box-top">
                <div class="credential-header">${esc(cfg.label)}</div>
                <div class="card-actions">
                    <button class="btn-small" onclick="openCredentialModal(${cred.ID})">Editar</button>
                </div>
            </div>
            ${fieldsHtml ? `<div class="credential-grid">${fieldsHtml}</div>` : ''}
            ${passwordHtml ? `<div class="credential-grid single-column" style="margin-top: 15px;">${passwordHtml}</div>` : ''}
        </div>
    `;
}

function createField(label, value, isPassword) {
    if (!value) return '';

    const fieldId = 'field_' + Math.random().toString(36).substr(2, 9);

    return `
        <div class="credential-field">
            <div class="field-label">${esc(label)}</div>
            <div class="field-value-wrapper">
                <div class="field-value ${isPassword ? 'password' : ''}" id="${fieldId}">${esc(value)}</div>
                ${isPassword ? `<button class="btn-icon" onclick="togglePassword('${fieldId}', this)">Mostrar</button>` : ''}
                <button class="btn-copy" onclick="copyToClipboard('${fieldId}', this)">Copiar</button>
            </div>
        </div>
    `;
}

function togglePassword(fieldId, button) {
    const field = document.getElementById(fieldId);
    field.classList.toggle('visible');
    button.textContent = field.classList.contains('visible') ? 'Ocultar' : 'Mostrar';
}

function copyToClipboard(fieldId, button) {
    const text = document.getElementById(fieldId).textContent;

    const onSuccess = () => {
        const originalText = button.textContent;
        button.textContent = 'Copiado!';
        button.classList.add('copied');
        showToast('Copiado para área de transferência!');
        setTimeout(() => {
            button.textContent = originalText;
            button.classList.remove('copied');
        }, 2000);
    };

    if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(text).then(onSuccess).catch(() => copyFallback(text, onSuccess));
    } else {
        copyFallback(text, onSuccess);
    }
}

function copyFallback(text, onSuccess) {
    const textarea = document.createElement('textarea');
    textarea.value = text;
    textarea.style.position = 'fixed';
    textarea.style.opacity = '0';
    document.body.appendChild(textarea);
    textarea.select();
    try {
        document.execCommand('copy');
        onSuccess();
    } catch (e) {
        showToast('Error copying!');
    }
    document.body.removeChild(textarea);
}

function showToast(message) {
    const toast = document.getElementById('toast');
    toast.textContent = message;
    toast.classList.add('show');
    setTimeout(() => toast.classList.remove('show'), 3000);
}

function openModal(id) {
    document.getElementById(id).classList.add('open');
}

function closeModal(id) {
    document.getElementById(id).classList.remove('open');
}

document.addEventListener('click', function (e) {
    if (e.target.classList && e.target.classList.contains('modal-overlay')) {
        e.target.classList.remove('open');
    }
    if (!e.target.closest('#configMenu')) closeConfigMenu();
});

document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') {
        document.querySelectorAll('.modal-overlay.open').forEach(m => m.classList.remove('open'));
        closeConfigMenu();
    }
});

function setupSystemPickers() {
    setupSystemPicker('credSistemaBusca', 'credSistemaLista', null);
}

function setupSystemPicker(inputId, listId, onSelect) {

    const input = document.getElementById(inputId);
    const list  = document.getElementById(listId);

    function render(term) {
        const t = (term || '').toLowerCase();
        const matches = allSystems
            .filter(s => (s.NOME_SISTEMA || '').toLowerCase().includes(t) ||
                         (s.TIPO_SISTEMA || '').toLowerCase().includes(t))
            .slice(0, 30);

        if (matches.length === 0) {
            list.innerHTML = '<div class="picker-empty">Nenhum sistema encontrado!</div>';
        } else {
            list.innerHTML = matches.map(s => `
                <div class="picker-item" data-id="${s.ID}">
                    <span class="picker-item-name">${esc(s.NOME_SISTEMA)}</span>
                    <span class="picker-item-meta">
                        ${s.TIPO_SISTEMA ? `<span class="picker-item-type">${esc(s.TIPO_SISTEMA)}</span>` : ''}
                        <span class="picker-item-count">${(s.credenciais || []).length} cred.</span>
                    </span>
                </div>
            `).join('');
        }

        list.classList.add('open');
    }

    input.addEventListener('input', function () {
        delete input.dataset.id;
        render(input.value);
        if (onSelect) onSelect(null);
    });

    input.addEventListener('focus', function () {
        render(input.value);
    });

    list.addEventListener('mousedown', function (e) {
        const item = e.target.closest('.picker-item');
        if (!item) return;

        const system = findSystem(item.dataset.id);
        if (!system) return;

        input.value = system.NOME_SISTEMA;
        input.dataset.id = system.ID;
        list.classList.remove('open');

        if (onSelect) onSelect(system);
    });

    document.addEventListener('click', function (e) {
        if (!e.target.closest('#' + inputId) && !e.target.closest('#' + listId)) {
            list.classList.remove('open');
        }
    });
}

function resetPicker(inputId, listId) {
    const input = document.getElementById(inputId);
    input.value = '';
    delete input.dataset.id;
    const list = document.getElementById(listId);
    list.innerHTML = '';
    list.classList.remove('open');
}

function setPickerSystem(inputId, system) {
    const input = document.getElementById(inputId);
    input.value = system ? system.NOME_SISTEMA : '';
    if (system) input.dataset.id = system.ID;
    else delete input.dataset.id;
}

function openSystemModal(id) {
    const system = id ? findSystem(id) : null;

    document.getElementById('modalSistemaTitle').textContent = system ? 'Edit System' : 'New System';
    document.getElementById('sisId').value        = system ? system.ID : '';
    document.getElementById('sisNome').value      = system ? (system.NOME_SISTEMA || '') : '';
    document.getElementById('sisTipo').value      = system ? (system.TIPO_SISTEMA || '') : '';
    document.getElementById('sisProtocolo').value = system ? (system.PROTOCOLO_SERVICO || '') : '';
    document.getElementById('sisPorta').value     = system ? (system.PORTA || '') : '';
    document.getElementById('sisLink').value      = system ? (system.LINK || '') : '';
    document.getElementById('sisDescricao').value = system ? (system.DESCRICAO || '') : '';

    document.getElementById('sisExcluir').style.display = system ? '' : 'none';

    openModal('modalSistema');
    document.getElementById('sisNome').focus();
}

async function saveSystem() {
    const payload = {
        ID:                document.getElementById('sisId').value || null,
        NOME_SISTEMA:      document.getElementById('sisNome').value,
        TIPO_SISTEMA:      document.getElementById('sisTipo').value,
        PROTOCOLO_SERVICO: document.getElementById('sisProtocolo').value,
        PORTA:             document.getElementById('sisPorta').value,
        LINK:              document.getElementById('sisLink').value,
        DESCRICAO:         document.getElementById('sisDescricao').value
    };

    if (!payload.NOME_SISTEMA.trim()) {
        showToast('Informe o nome do sistema');
        return;
    }

    try {
        await api('salvar_sistema', payload);
        closeModal('modalSistema');
        showToast(payload.ID ? 'Sistema Atualizado!' : 'Sistema Cadastrado!');
        loadSystems();
    } catch (error) {
        showToast('Error: ' + error.message);
    }
}

async function deleteSystemFromModal() {
    const id     = document.getElementById('sisId').value;
    const system = findSystem(id);
    if (!system) return;

    const total = (system.credenciais || []).length;
    const aviso = `Excluir o sistema "${system.NOME_SISTEMA}"` +
                  (total ? ` e as ${total} credencial(is) dele?` : '?') +
                  '\n\nEsta ação é permanente!';

    if (!confirm(aviso)) return;

    try {
        await api('excluir_sistema', { ID: id });
        closeModal('modalSistema');
        showToast('Sistema excluído!');
        loadSystems();
    } catch (error) {
        showToast('Error: ' + error.message);
    }
}

function openCredentialModal(credId, sistemaId) {

    const cred = credId ? findCredential(credId) : null;

    document.getElementById('modalCredencialTitle').textContent = cred ? 'Edit Credential' : 'New Credential';
    document.getElementById('credId').value = cred ? cred.ID : '';
    document.getElementById('credNovoSistema').value = '';
    document.getElementById('credExcluir').style.display = cred ? '' : 'none';

    credSystemMode = 'existente';
    document.querySelectorAll('#credModoSistema .seg-btn').forEach(b => {
        b.classList.toggle('active', b.dataset.modo === 'existente');
    });
    document.getElementById('credSistemaExistente').style.display = '';
    document.getElementById('credSistemaNovo').style.display = 'none';

    document.getElementById('credModoSistema').style.display = cred ? 'none' : '';

    resetPicker('credSistemaBusca', 'credSistemaLista');
    const preSelected = cred ? findSystem(cred.ID_SISTEMA) : (sistemaId ? findSystem(sistemaId) : null);
    if (preSelected) setPickerSystem('credSistemaBusca', preSelected);

    currentCredType = cred ? cred.TIPO : 'database';
    renderTypePills(currentCredType);
    buildCredFields(currentCredType, cred || {});

    openModal('modalCredencial');
    if (!preSelected) document.getElementById('credSistemaBusca').focus();
}

function setCredSystemMode(mode, button) {
    credSystemMode = mode;

    document.querySelectorAll('#credModoSistema .seg-btn').forEach(b => b.classList.remove('active'));
    button.classList.add('active');

    document.getElementById('credSistemaExistente').style.display = (mode === 'existente') ? '' : 'none';
    document.getElementById('credSistemaNovo').style.display      = (mode === 'novo') ? '' : 'none';

    if (mode === 'novo') document.getElementById('credNovoSistema').focus();
    else document.getElementById('credSistemaBusca').focus();
}

function renderTypePills(selected) {
    const container = document.getElementById('credTipoPills');

    const tipos = new Set(Object.keys(CREDENTIAL_TYPES));
    tiposEmUso().forEach(([tipo]) => tipos.add(tipo));
    if (selected) tipos.add(selected);

    let html = '';
    tipos.forEach(tipo => {
        const cfg = typeConfig(tipo);
        html += `<button type="button" class="type-pill${tipo === selected ? ' active' : ''}"
                    style="--type-color:${cfg.color}"
                    onclick="selectCredType('${esc(tipo)}', this)">${esc(cfg.label)}</button>`;
    });

    html += `<button type="button" class="type-pill new-type" onclick="promptCredType()">+ OUTRO</button>`;

    container.innerHTML = html;
}

function promptCredType() {
    const informado = prompt('Nome do novo tipo de credencial (ex: API, VPN, SSH...):');
    if (informado === null) return;

    const tipo = informado.trim().toLowerCase();
    if (!tipo) return;

    const atuais = coletarCamposCred();
    currentCredType = tipo;
    renderTypePills(tipo);
    buildCredFields(tipo, atuais);
}

function selectCredType(tipo, button) {
    currentCredType = tipo;

    document.querySelectorAll('#credTipoPills .type-pill').forEach(b => b.classList.remove('active'));
    button.classList.add('active');

    buildCredFields(tipo, coletarCamposCred());
}

function coletarCamposCred() {
    const valores = {};
    document.querySelectorAll('#credFields [data-field]').forEach(el => {
        valores[el.dataset.field] = el.value;
    });
    return valores;
}

function buildCredFields(tipo, values) {
    const cfg = typeConfig(tipo);

    let html = '<div class="form-grid-2">';
    cfg.fields.forEach(field => {
        const value = values[field.name] || '';

        if (field.textarea) {
            html += `
                <div class="form-group full-width">
                    <label>${esc(field.label)}</label>
                    <textarea data-field="${field.name}" rows="2">${esc(value)}</textarea>
                </div>
            `;
        } else {
            html += `
                <div class="form-group${field.password ? ' full-width' : ''}">
                    <label>${esc(field.label)}</label>
                    <input type="text" data-field="${field.name}" value="${esc(value)}" autocomplete="off" spellcheck="false">
                </div>
            `;
        }
    });
    html += '</div>';

    document.getElementById('credFields').innerHTML = html;
}

async function saveCredential() {

    const credId = document.getElementById('credId').value || null;
    let idSistema = null;

    try {

        if (credSystemMode === 'novo' && !credId) {

            const nomeNovo = document.getElementById('credNovoSistema').value.trim();
            if (!nomeNovo) {
                showToast('Informe o nome do novo sistema');
                return;
            }

            const result = await api('salvar_sistema', { NOME_SISTEMA: nomeNovo });
            idSistema = result.id;

        } else {

            idSistema = document.getElementById('credSistemaBusca').dataset.id;
            if (!idSistema) {
                showToast('Pesquise e selecione um sistema');
                return;
            }
        }

        const payload = { ID: credId, ID_SISTEMA: idSistema, TIPO: currentCredType };
        Object.assign(payload, coletarCamposCred());

        await api('salvar_credencial', payload);
        closeModal('modalCredencial');
        showToast(credId ? 'Credencial atualizada' : 'Credencial cadastrada');
        loadSystems();

    } catch (error) {
        showToast('Error: ' + error.message);
    }
}

async function deleteCredentialFromModal() {
    const credId = document.getElementById('credId').value;
    const cred   = findCredential(credId);
    if (!cred) return;

    const cfg = typeConfig(cred.TIPO);
    if (!confirm(`Excluir a credencial ${cfg.label} (${cred.USUARIO || cred.HOST || 'ID ' + cred.ID})?\n\nEsta ação é permanente!`)) return;

    try {
        await api('excluir_credencial', { ID: credId });
        closeModal('modalCredencial');
        showToast('Credencial excluída!');
        loadSystems();
    } catch (error) {
        showToast('Error: ' + error.message);
    }
}
