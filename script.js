const serverSelects = document.querySelectorAll('[data-server]');
const genderCards = document.querySelectorAll('[data-gender]');

const computedOrigin = window.__BACKEND_URL__
  || (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1' ? 'http://localhost:3000' : null)
  || (window.location.protocol === 'file:' ? 'http://localhost:3000' : null)
  || window.location.origin;

const BACKEND_ORIGIN = computedOrigin;
const SITE_ORIGIN = window.location.origin === 'null' ? 'http://localhost:3001' : window.location.origin;
const API_LINK_PATH = `${BACKEND_ORIGIN}/start-discord-link`;
const API_VINCULAR_PATH = `${BACKEND_ORIGIN}/api/usuario/vincular`;
const DISCORD_MAINT_PAGE = 'discord-manutencao.html';

console.log('[Discord Integracao] BACKEND_ORIGIN', BACKEND_ORIGIN);
console.log('[Discord Integracao] API_LINK_PATH', API_LINK_PATH);
console.log('[Discord Integracao] API_VINCULAR_PATH', API_VINCULAR_PATH);
console.log('[Discord Integracao] DISCORD_MAINT_PAGE', DISCORD_MAINT_PAGE);

// Função para capturar IP e Plataforma
async function obterIPePlatforma(){
  try {
    const response = await fetch('https://api.ipify.org?format=json');
    const data = await response.json();
    const ip = data.ip;
    
    // Detectar plataforma
    let plataforma = 'Desktop';
    if(/Mobile|Android|iPhone|iPad/i.test(navigator.userAgent)) plataforma = 'Mobile';
    if(/SmartTV|WebOS|Tizen|BRAVIA/i.test(navigator.userAgent)) plataforma = 'Televisão';
    
    // Detectar SO específico
    let so = 'Windows';
    if(/Windows Phone/i.test(navigator.userAgent)) so = 'Windows Phone';
    else if(/iPhone|iPad|iOS/i.test(navigator.userAgent)) so = 'iOS';
    else if(/Android/i.test(navigator.userAgent)) so = 'Android';
    else if(/Mac/i.test(navigator.userAgent)) so = 'macOS';
    else if(/Linux/i.test(navigator.userAgent)) so = 'Linux';
    
    // Detectar navegador
    let navegador = 'Desconhecido';
    if(/Chrome/i.test(navigator.userAgent) && !/Edge/i.test(navigator.userAgent)) navegador = 'Chrome';
    else if(/Firefox/i.test(navigator.userAgent)) navegador = 'Firefox';
    else if(/Safari/i.test(navigator.userAgent) && !/Chrome/i.test(navigator.userAgent)) navegador = 'Safari';
    else if(/Edge/i.test(navigator.userAgent)) navegador = 'Edge';
    
    return {
      ip: ip,
      plataforma: plataforma,
      so: so,
      navegador: navegador,
      timestamp: new Date().toISOString()
    };
  } catch(e) {
    // Fallback se não conseguir pegar o IP
    let plataforma = 'Desktop';
    if(/Mobile|Android|iPhone|iPad/i.test(navigator.userAgent)) plataforma = 'Mobile';
    
    let so = 'Windows';
    if(/iPhone|iPad|iOS/i.test(navigator.userAgent)) so = 'iOS';
    else if(/Android/i.test(navigator.userAgent)) so = 'Android';
    else if(/Mac/i.test(navigator.userAgent)) so = 'macOS';
    
    return {
      ip: 'Desconhecido',
      plataforma: plataforma,
      so: so,
      navegador: 'Desconhecido',
      timestamp: new Date().toISOString()
    };
  }
}

function handleServerSelect(e){
  const form = e.target.closest('form');
  const error = form.querySelector('.error');
  if(e.target.value === 'none'){
    showMessage(error, 'Selecione um servidor.');
    return;
  }
  if(e.target.value !== 'server1'){
    showToast('Este servidor ainda não está disponível.', 'info');
    showMessage(error, 'Este servidor ainda não está disponível. Apenas Servidor 1 é aceito.');
    e.target.value = 'server1';
    return;
  }
  showMessage(error, 'Servidor selecionado: Servidor 1');
  setTimeout(() => { error.textContent = ''; }, 500); // pequena limpeza após feedback
}
serverSelects.forEach(s => s.addEventListener('change', handleServerSelect));

genderCards.forEach(card => {
  card.addEventListener('click', () => {
    genderCards.forEach(c => c.classList.remove('selected'));
    card.classList.add('selected');
    const input = document.querySelector('#gender');
    if (input) input.value = card.dataset.gender;
  });
});

let messageTimer = null;

function showToast(text, type = 'info'){
  if(!document.querySelector('.toast-container')){
    const container = document.createElement('div');
    container.className = 'toast-container';
    document.body.appendChild(container);
  }
  const container = document.querySelector('.toast-container');
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  const icons = { success: '✓', error: '✕', info: 'ℹ' };
  toast.innerHTML = `<div class="toast-icon">${icons[type]}</div><div class="toast-message">${text}</div>`;
  container.appendChild(toast);
  setTimeout(() => {
    toast.classList.add('hide');
    setTimeout(() => toast.remove(), 300);
  }, 30000);
}

function showMessage(el, text){
  if(!el) return;
  el.textContent = text;
  el.classList.add('visible','animate');
  clearTimeout(messageTimer);
  messageTimer = setTimeout(() => {
    el.classList.remove('visible','animate');
    el.textContent = '';
  }, 30000);
}

function resetAllAccounts(){
  localStorage.removeItem('accounts');
  localStorage.removeItem('accountLogs');
  localStorage.removeItem('hospital_role_permissions');
  localStorage.removeItem('hospital_ticket_history');
  localStorage.removeItem('hospital_messages_schedule');
  localStorage.removeItem('discordUser');
  sessionStorage.removeItem('loggedUser');
  localStorage.removeItem('discord_oauth_states');

  showToast('✅ Todas as contas e logs foram removidos do localStorage.', 'success');
  console.log('RESET: O armazenamento local do site foi limpo (accounts, logs, roles, tickets, mensagens).');
}

// Atalho rápido para chamar via console: resetAllAccounts()
function gerarRG(){
  return Math.floor(10000000 + Math.random() * 90000000) + '-' + Math.floor(10 + Math.random() * 89);
}

function getCurrentUsernameForLink(){
  const logged = sessionStorage.getItem('loggedUser');
  if(logged) return logged;

  const loginNameField = document.querySelector('#login-form input[name="username"]');
  if(loginNameField && loginNameField.value.trim()) return loginNameField.value.trim();

  const registerNameField = document.querySelector('#registro-form input[name="username"]');
  return registerNameField ? registerNameField.value.trim() : '';
}

// Login via Discord
const loginDiscordBtn = document.getElementById('loginDiscordBtn');
if(loginDiscordBtn){
  loginDiscordBtn.addEventListener('click', (e) => {
    e.preventDefault();
    showToast('Sistema de vinculação temporariamente em manutenção.', 'info');
    setTimeout(() => {
      window.location.href = DISCORD_MAINT_PAGE;
    }, 450);
  });
}

function openDiscordMaintenance(){
  showToast('Sistema de Discord em manutenção, redirecionando...', 'info');
  setTimeout(() => {
    window.location.href = DISCORD_MAINT_PAGE;
  }, 450);
}


// Verificar se voltou de autenticação Discord
const urlParams = new URLSearchParams(window.location.search);
const oauthError = urlParams.get('error');
if(oauthError){
  showToast(`Erro de autenticação Discord: ${oauthError}`, 'error');
  window.history.replaceState({}, document.title, window.location.pathname);
}

if(urlParams.get('discord') === 'linked'){
  const encodedData = urlParams.get('data');
  const linkedUser = urlParams.get('linked_user');
  let discordUser = null;

  if(encodedData){
    try {
      const decoded = atob(encodedData);
      discordUser = JSON.parse(decoded);
    } catch(e) {
      console.error('Erro ao decodificar data do Discord:', e);
    }
  }

  if(discordUser){
    const accounts = JSON.parse(localStorage.getItem('accounts') || '[]');
    const currentUser = linkedUser || sessionStorage.getItem('loggedUser') || getCurrentUsernameForLink();

    if(currentUser){
      let account = accounts.find(a => a.username === currentUser);
      if(!account){
        // fallback, encontra por discordId
        account = accounts.find(a => a.discordId === discordUser.discordId);
      }

      if(account){
        account.discord = `${discordUser.username}#${discordUser.discriminator || '0000'}`;
        account.discordId = discordUser.id;
        account.discordLinked = true;
        localStorage.setItem('accounts', JSON.stringify(accounts));
      }
    }

    sessionStorage.setItem('discord_vinculado', 'true');
    sessionStorage.setItem('discord_user', discordUser.username);
    sessionStorage.setItem('discord_user_id', discordUser.id);
    sessionStorage.setItem('discord_user_full', JSON.stringify(discordUser));
    if(linkedUser) sessionStorage.setItem('linked_user', linkedUser);

    showToast('Conta do Discord vinculada com sucesso!', 'success');
    showMessage(document.querySelector('.error'), 'Conta do Discord vinculada com sucesso!');

    const discordVinculadoDiv = document.getElementById('discordVinculado');
    if(discordVinculadoDiv){
      discordVinculadoDiv.style.display = 'block';
      discordVinculadoDiv.textContent = `✅ Conta do Discord vinculada: ${discordUser.username}#${discordUser.discriminator || '0000'}`;
    }

    // Atualizar painel se estiver na página de painel
    const painelStatus = document.getElementById('discord-status');
    if(painelStatus){
      painelStatus.textContent = `Discord vinculado: ${discordUser.username}#${discordUser.discriminator || '0000'}`;
      painelStatus.classList.add('linked');
    }
  }

  window.history.replaceState({}, document.title, window.location.pathname);
}

// Fim do bloco de verificação de retorno Discord

function saveAndRedirect(data){
  sessionStorage.setItem('processData', JSON.stringify(data));
  window.location.href = 'process.html';
}

const loginForm = document.querySelector('#login-form');
if(loginForm){
  loginForm.addEventListener('submit', e => {
    e.preventDefault();
    const user = loginForm.querySelector('input[name="username"]').value.trim();
    const pass = loginForm.querySelector('input[name="password"]').value.trim();
    const server = loginForm.querySelector('select[name="server"]').value;
    const error = loginForm.querySelector('.error');
    if(!user || !pass){
      showToast('Campos faltando. Preencha nome e senha.', 'error');
      showMessage(error, 'Campos faltando. Preencha nome e senha.');
      return;
    }
    if(server === 'none'){
      showToast('Selecione um servidor.', 'error');
      showMessage(error, 'Selecione um servidor.');
      return;
    }
    if(server !== 'server1'){
      showToast('Este servidor ainda não está disponível.', 'error');
      showMessage(error, 'Este servidor ainda não está disponível. Apenas Servidor 1.');
      return;
    }
    // Verificar conta
    const accounts = JSON.parse(localStorage.getItem('accounts') || '[]');
    const account = accounts.find(acc => acc.username === user);
    if(!account){
      showToast('Nome inválido.', 'error');
      showMessage(error, 'Nome inválido. Verifique seu usuário.');
      return;
    }
    if(account.password !== pass){
      showToast('Senha incorreta.', 'error');
      showMessage(error, 'Senha incorreta. Confira e tente novamente.');
      return;
    }
    // Verificar se conta está bloqueada
    if(account.bloqueado){
      const dataDesbloqueio = new Date(account.blockedUntil);
      const agora = new Date();
      if(agora < dataDesbloqueio){
        const diasRestantes = Math.ceil((dataDesbloqueio - agora) / (1000 * 60 * 60 * 24));
        sessionStorage.setItem('blockedInfo', JSON.stringify({
          username: account.username,
          reason: account.blockedReason,
          until: account.blockedUntil,
          blockedBy: account.blockedBy,
          daysRemaining: diasRestantes
        }));
        window.location.href = 'conta-bloqueada.html';
        return;
      } else {
        // Remover bloqueio se expirou
        account.bloqueado = false;
        account.blockedUntil = null;
        account.blockedReason = null;
        const idx = accounts.indexOf(account);
        accounts[idx] = account;
        localStorage.setItem('accounts', JSON.stringify(accounts));
      }
    }
    error.textContent = '';
    // Salvar log
    const logs = JSON.parse(localStorage.getItem('accountLogs') || '[]');
    logs.push({ action: 'login', user, server, timestamp: new Date().toISOString() });
    localStorage.setItem('accountLogs', JSON.stringify(logs));
    // Salvar usuário logado
    sessionStorage.setItem('loggedUser', user);
    showToast('Login realizado com sucesso!', 'success');
    showMessage(error, 'Login realizado com sucesso!');
    setTimeout(() => { window.location.href = 'painel.html'; }, 800);
  });
}

// Gerenciar vinculação Discord no registro
const vincularBtn = document.getElementById('vincularDiscordBtn');
const criarContaBtn = document.getElementById('criarContaBtn');
const discordVinculadoDiv = document.getElementById('discordVinculado');

if(vincularBtn){
  vincularBtn.addEventListener('click', (e) => {
    e.preventDefault();
    const user = document.querySelector('#registro-form input[name="username"]').value.trim();
    const pass = document.querySelector('#registro-form input[name="password"]').value.trim();
    const server = document.querySelector('#registro-form select[name="server"]').value;
    const terms = document.querySelector('#registro-form input[name="terms"]').checked;
    const discordField = document.querySelector('#discordInput').value.trim();

    if(!user || !pass || server === 'none' || !terms){
      showToast('Por favor, preencha todos os campos e aceite os termos antes de ir para manutenção.', 'error');
      return;
    }

    const gender = document.querySelector('#gender').value;
    sessionStorage.setItem('pendingRegistration', JSON.stringify({
      username: user,
      password: pass,
      server,
      gender,
      discord: discordField || 'Não informado'
    }));

    openDiscordMaintenance();
  });
}



function setVisitedMaintenanceFlag(){
  sessionStorage.setItem('visitedMaintenance', 'true');
}

function initMaintenanceGate(){
  const hasVisited = sessionStorage.getItem('visitedMaintenance') === 'true';
  const registroLink = document.getElementById('registroLink');
  const criarContaBtn = document.getElementById('criarContaBtn');
  const registroForm = document.getElementById('registro-form');

  if(registroLink){
    if(!hasVisited){
      registroLink.href = 'registro.html';
      registroLink.title = 'Você precisa visitar a página de manutenção antes de criar conta.';
      registroLink.style.pointerEvents = 'auto';
      registroLink.style.opacity = '0.9';
    } else {
      registroLink.href = 'registro.html';
      registroLink.style.pointerEvents = 'auto';
      registroLink.style.opacity = '1';
      registroLink.title = '';
    }
  }

  if(registroForm && criarContaBtn){
    const panelMessage = registroForm.querySelector('.panel-warning');
    if(!hasVisited){
      criarContaBtn.disabled = true;
      criarContaBtn.style.opacity = '0.5';
      criarContaBtn.style.cursor = 'not-allowed';
    } else {
      criarContaBtn.disabled = false;
      criarContaBtn.style.opacity = '1';
      criarContaBtn.style.cursor = 'pointer';
    }
  }
}

document.addEventListener('DOMContentLoaded', () => {
  if(window.location.pathname.includes('registro.html')){
    // Limpa contas existentes para começar com base limpa e garantir primeira conta como admin
    localStorage.setItem('accounts', '[]');
    localStorage.setItem('accountLogs', '[]');
  }

  initMaintenanceGate();

  const pending = sessionStorage.getItem('pendingRegistration');
  if(pending){
    try {
      const data = JSON.parse(pending);
      const usernameInput = document.querySelector('#registro-form input[name="username"]');
      const passwordInput = document.querySelector('#registro-form input[name="password"]');
      const serverSelect = document.querySelector('#registro-form select[name="server"]');
      const genderInput = document.querySelector('#gender');
      const discordInput = document.querySelector('#discordInput');

      if(usernameInput && !usernameInput.value.trim()) usernameInput.value = data.username || '';
      if(passwordInput && !passwordInput.value.trim()) passwordInput.value = data.password || '';
      if(serverSelect && data.server) serverSelect.value = data.server;
      if(genderInput && data.gender) genderInput.value = data.gender;
      if(discordInput && !discordInput.value.trim()) discordInput.value = data.discord || '';

      // Se tiver retornado da manutenção, garantir ativação de criar conta
      if(sessionStorage.getItem('visitedMaintenance') === 'true'){
        const criarContaBtn = document.getElementById('criarContaBtn');
        if(criarContaBtn){
          criarContaBtn.disabled = false;
          criarContaBtn.style.opacity = '1';
          criarContaBtn.style.cursor = 'pointer';
        }
      }

    } catch (error) {
      console.error('Erro ao ler pendingRegistration:', error);
    }
  }
});

const registerForm = document.querySelector('#registro-form');
if(registerForm){
  registerForm.addEventListener('submit', async e => {
    e.preventDefault();
    
    // Nota: vinculação com Discord está em manutenção.
    // O usuário pode criar conta sem precisar vincular por enquanto.
    const user = registerForm.querySelector('input[name="username"]').value.trim();
    const pass = registerForm.querySelector('input[name="password"]').value.trim();
    const discordInput = registerForm.querySelector('input[name="discord"]');
    const discord = discordInput ? discordInput.value.trim() : sessionStorage.getItem('discord_user') || 'Não informado';
    const server = registerForm.querySelector('select[name="server"]').value;
    const terms = registerForm.querySelector('input[name="terms"]').checked;
    const gender = document.querySelector('#gender').value;
    const error = registerForm.querySelector('.error');
    if(!user || !pass){
      showToast('Preencha todos os campos.', 'error');
      return;
    }
    if(server === 'none'){
      showToast('Selecione um servidor.', 'error');
      return;
    }
    if(server !== 'server1'){
      showToast('Este servidor ainda não está disponível.', 'error');
      return;
    }
    if(!terms){
      showToast('Aceite os termos para continuar.', 'error');
      return;
    }
    // Verificar se conta já existe
    const accounts = JSON.parse(localStorage.getItem('accounts') || '[]');
    const existing = accounts.find(acc => acc.username === user);
    if(existing){
      showToast('Conta já cadastrada.', 'error');
      return;
    }
    error.textContent = '';
    
    // Obter IP e Plataforma
    const device = await obterIPePlatforma();
    
    // Salvar conta
    const novoRG = gerarRG();
    const discordUserId = sessionStorage.getItem('discord_user_id');
    const role = accounts.length === 0 ? 'Dono' : 'Membro';
    accounts.push({ 
      username: user, 
      password: pass, 
      server, 
      gender, 
      discord, 
      registeredAt: new Date().toISOString(), 
      rg: novoRG, 
      role,
      permissionLevel: role === 'Dono' ? 999 : 1,
      ipRegistro: device.ip,
      plataforma: device.plataforma,
      so: device.so,
      navegador: device.navegador,
      deviceInfo: device,
      discordLinked: true,
      discordId: discordUserId
    });
    localStorage.setItem('accounts', JSON.stringify(accounts));
    // Salvar log
    const logs = JSON.parse(localStorage.getItem('accountLogs') || '[]');
    logs.push({ action: 'register', user, server, timestamp: new Date().toISOString() });
    localStorage.setItem('accountLogs', JSON.stringify(logs));
    sessionStorage.setItem('loggedUser', user);
    // Salvar dados para o processo de verificação
    sessionStorage.setItem('processData', JSON.stringify({
      name: user,
      password: pass,
      server,
      gender,
      discord,
      role: 'Cargo em definição',
      subtitle: 'Criando sua conta...'
    }));
    showToast('Iniciando criação da conta...', 'success');
    setTimeout(() => { window.location.href = 'process.html'; }, 800);
  });
}

function setupMenuToggle(){
  const main = document.querySelector('.main') || document.querySelector('.page') || document.body;
  const currentPage = window.location.pathname.split('/').pop() || 'index.html';
  const noMenuPages = ['index.html', 'registro.html', 'entrar-conta.html', 'conta-bloqueada.html', 'process.html'];

  if(noMenuPages.includes(currentPage)){
    const existingSidebar = document.querySelector('.sidebar');
    if(existingSidebar) existingSidebar.remove();
    const existingToggle = document.getElementById('menu-toggle');
    if(existingToggle) existingToggle.remove();
    return;
  }

  const menuItems = [
    { label: 'Início', href: 'painel.html' },
    { label: 'Minha Conta', href: 'minha-conta.html' },
    { label: 'Membros', href: 'membros.html' },
    { label: 'Registros', href: 'registros.html' },
    { label: 'Sistema Administrativo', href: 'sistema-administrativo.html' },
    { label: 'Tickets', href: 'ticket.html' },
    { label: 'Mensagens', href: 'mensagens.html' },
    { label: 'Servidor', href: 'servidor.html' },
    { label: 'Configurações', href: 'configuracoes.html' },
    { label: 'Entrada e Saída', href: 'entrada-saida.html' },
    { label: 'Punições', href: 'punicoes.html' }
  ];

  let sidebar = document.querySelector('.sidebar');
  const sidebarWasClosed = sidebar ? sidebar.classList.contains('closed') : null;

  // Cria sidebar se ainda não existir
  if(!sidebar){
    sidebar = document.createElement('div');
    sidebar.className = 'sidebar';
    document.body.appendChild(sidebar);
  }

  // Estado persistente de sidebar (aberto/fechado)
  const persisted = localStorage.getItem('hospitalSidebarClosed');
  if(persisted !== null){
    if(persisted === 'true') sidebar.classList.add('closed');
    else sidebar.classList.remove('closed');
  } else if(sidebarWasClosed !== null){
    if(sidebarWasClosed) sidebar.classList.add('closed');
    else sidebar.classList.remove('closed');
  } else {
    sidebar.classList.remove('closed');
  }

  sidebar.innerHTML = `
    <div class="logo-row">
      <div class="logo">Sistema Hospital</div>
    </div>
    <div class="menu"></div>
  `;

  const menu = sidebar.querySelector('.menu');

  menuItems.forEach(item => {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.textContent = item.label;
    if(item.href === currentPage || (currentPage === '' && item.href === 'painel.html')){
      btn.classList.add('active');
    }
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      if(window.location.pathname.split('/').pop() !== item.href){
        window.location.href = item.href;
      }
    });
    menu.appendChild(btn);
  });

  let menuToggle = document.getElementById('menu-toggle');
  if(!menuToggle){
    menuToggle = document.createElement('button');
    menuToggle.id = 'menu-toggle';
    menuToggle.className = 'menu-toggle-btn';
    menuToggle.type = 'button';
    menuToggle.textContent = '☰';
    menuToggle.style.display = 'block';
    document.body.appendChild(menuToggle);

    menuToggle.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      sidebar.classList.toggle('closed');
      updateMenuState();
    });
  }

  function updateMenuState(){
    const closed = sidebar.classList.contains('closed');
    if(closed){
      main.style.marginLeft = '0';
      menuToggle.style.left = '18px';
    } else {
      main.style.marginLeft = '250px';
      menuToggle.style.left = '188px';
    }
    localStorage.setItem('hospitalSidebarClosed', closed.toString());
  }

  updateMenuState();
}

// old setupMenuToggle call is now handled in initSite for centralized init
// window.addEventListener('DOMContentLoaded', setupMenuToggle);

if(window.location.pathname.endsWith('process.html')){
  const processDataText = sessionStorage.getItem('processData');
  if(!processDataText){
    const subtitle = document.getElementById('process-subtitle');
    if(subtitle) subtitle.textContent = 'Nenhum dado de cadastro foi encontrado. Retorne à página inicial.';
    const goHome = document.getElementById('go-home');
    if(goHome) { goHome.classList.remove('hidden'); goHome.textContent = 'Voltar para o início'; goHome.onclick = () => window.location.href='index.html'; }
  } else {
    const data = JSON.parse(processDataText);
    const subtitle = document.getElementById('process-subtitle');
    if(subtitle) subtitle.textContent = data.subtitle || 'Configurando seu painel...';

    const reportName = document.getElementById('report-name');
    const reportPass = document.getElementById('report-pass');
    const reportServer = document.getElementById('report-server');
    const reportRole = document.getElementById('report-role');
    const reportDiscord = document.getElementById('report-discord');
    const reportGender = document.getElementById('report-gender');
    if(reportGender) reportGender.textContent = data.gender || '-';
    if(reportName) reportName.textContent = data.name || '-';
    if(reportPass) reportPass.textContent = data.password || '-';

    // Ajusta a imagem do painel de verificação com avatar de médico ou enfermeira
    const processLogo = document.querySelector('.process-top .process-logo');
    if(processLogo){
      processLogo.src = data.gender === 'feminino' ? 'images/nurse-female.jpeg' : 'images/doctor-male.jpeg';
      processLogo.alt = data.gender === 'feminino' ? 'Enfermeira' : 'Médico';
    }
    if(reportServer) reportServer.textContent = data.server || '-';
    if(reportRole) reportRole.textContent = data.role || 'A definir';
    if(reportDiscord) reportDiscord.textContent = data.discord || 'Não informado';

    const progressBar = document.getElementById('progress-bar');
    const progressText = document.getElementById('progress-text');
    const progressMessage = document.getElementById('progress-message');
    const accountLocked = document.getElementById('account-locked');
    const accountReport = document.getElementById('account-report');
    const goHome = document.getElementById('go-home');

    const duration = 120000;
    const start = Date.now();
    const interval = setInterval(() => {
      const elapsed = Date.now() - start;
      const value = Math.min(100, Math.floor((elapsed / duration) * 100));
      if(progressBar) progressBar.style.width = `${value}%`;
      if(progressText) progressText.textContent = `${value}%`;
      if(progressMessage){
        if(value < 30) progressMessage.textContent = 'Conectando ao servidor...';
        else if(value < 60) progressMessage.textContent = 'Verificando permissões...';
        else if(value < 85) progressMessage.textContent = 'Sincronizando dados...';
        else if(value < 99) progressMessage.textContent = 'Preparando relatório...';
        else progressMessage.textContent = 'Finalizando acesso...';
      }
      if(value >= 100){
        clearInterval(interval);
        if(accountLocked) accountLocked.classList.remove('hidden');
        if(accountReport) accountReport.classList.remove('hidden');
        if(goHome){
          goHome.classList.remove('hidden');
          goHome.textContent = 'Ir para o Painel';
          goHome.onclick = () => { window.location.href = 'painel.html'; };
        }
      }
    }, 450);

  }
}

// ---------- Sistema de controle adicional (Tickets, Mensagens, Permissões) ----------
const STORAGE_TICKET_HISTORY = 'hospital_ticket_history';
const STORAGE_MESSAGE_SCHEDULE = 'hospital_messages_schedule';
const STORAGE_ROLE_PERMISSIONS = 'hospital_role_permissions';

function loadJson(key, defaultValue){
  try { return JSON.parse(localStorage.getItem(key) || 'null') || defaultValue; }
  catch(e){ return defaultValue; }
}

function saveJson(key, value){
  localStorage.setItem(key, JSON.stringify(value));
}

function getCurrentRole(){
  const loggedUser = sessionStorage.getItem('loggedUser');
  if(!loggedUser) return 'guest';
  const accounts = loadJson('accounts', []);
  const user = accounts.find(a => a.username === loggedUser);
  return (user && user.role) ? user.role : 'member';
}

function getRolePermissions(role){
  const all = loadJson(STORAGE_ROLE_PERMISSIONS, {});
  if(!all[role]){
    const normalizedRole = role.toLowerCase();
    const isSuper = ['admin','dono','diretor(a)','diretor','coordenador(a)','coordenador','adm principal'].includes(normalizedRole);
    const isMember = normalizedRole === 'membro';

    all[role] = {
      inicio: true,
      minhaConta: !isMember,
      membros: !isMember,
      registros: isSuper,
      sistemaAdministrativo: isSuper,
      tickets: !isMember,
      mensagens: !isMember,
      servidor: isSuper,
      configuracoes: isSuper,
      entradaSaida: !isMember,
      punicoes: isSuper
    };
    saveJson(STORAGE_ROLE_PERMISSIONS, all);
  }
  return all[role];
}

function canAccessPage(page){
  const role = getCurrentRole();
  const perms = getRolePermissions(role);
  const map = {
    'painel.html':'inicio',
    'minha-conta.html':'minhaConta',
    'membros.html':'membros',
    'registros.html':'registros',
    'sistema-administrativo.html':'sistemaAdministrativo',
    'ticket.html':'tickets',
    'mensagens.html':'mensagens',
    'servidor.html':'servidor',
    'configuracoes.html':'configuracoes',
    'entrada-saida.html':'entradaSaida',
    'punicoes.html':'punicoes'
  };
  const key = map[page];
  return key ? !!perms[key] : true;
}

function applyRoleProtection(){
  const currentPage = window.location.pathname.split('/').pop() || 'index.html';
  if(!canAccessPage(currentPage)){
    showToast('Acesso negado. Você não possui permissão para esta área.', 'error');
    setTimeout(()=>window.location.href='painel.html', 800);
    return false;
  }
  return true;
}

function ensureResponsiveMenu(){
  const styleId = 'hospital-responsive-styles';
  if(document.getElementById(styleId)) return;
  const css = `
    .main{transition:margin-left .2s ease;}
    .sidebar{width:250px; position:fixed; top:0; left:0; height:100vh; overflow-y:auto; z-index:900;}
    @media(max-width:1024px){ .sidebar{position:fixed; width:220px;} .main{margin-left:0 !important;} }
    @media(max-width:768px){ .main{margin-left:0 !important; padding:18px;} .sidebar{width:100%; height:auto; position:relative; transform:none !important;} }
    @media(max-width:480px){ .page-header h1{font-size:1.4rem;} .btn{padding:9px 12px; font-size:.88rem;} }
  `;
  const el = document.createElement('style');
  el.id = styleId;
  el.textContent = css;
  document.head.appendChild(el);
}

function formatDateLocal(when){
  return new Date(when).toLocaleString('pt-BR');
}

function initTicketPage(){
  if(!window.location.pathname.endsWith('ticket.html')) return;

  const container = document.querySelector('.main');
  if(!container) return;

  container.innerHTML = `
    <div class="page-header">
      <h1>Tickets</h1>
      <p>Crie ticket e visualize histórico com painel de pré-visualização.</p>
    </div>
    <div class="tabs">
      <button id="tab-create" class="tab-btn active">Criar Ticket</button>
      <button id="tab-history" class="tab-btn">Histórico de Ticket</button>
    </div>
    <div id="ticket-create" class="section active">
      <div class="field"><label>Canal de destino</label><select id="ticketChannel"><option value="#geral">#geral</option><option value="#suporte">#suporte</option><option value="#tickets">#tickets</option></select></div>
      <div class="field"><label>Nick</label><input type="text" id="ticketNick" placeholder="Nome do usuário"></div>
      <div class="field"><label>RG</label><input type="text" id="ticketRg" placeholder="RG do usuário"></div>
      <div class="field"><label>Texto do Painel</label><textarea id="ticketText" rows="3" placeholder="Mensagem do painel..." ></textarea></div>
      <div class="field"><label>Link da imagem (opcional)</label><input type="text" id="ticketImage" placeholder="https://..."/></div>
      <div class="field"><label>Cor do painel</label><input type="color" id="ticketColor" value="#2f92ff"/></div>
      <button id="ticketPreviewBtn" class="btn btn-primary">Atualizar pré-visualização</button>
      <button id="ticketCreateBtn" class="btn btn-primary">Criar Ticket</button>
      <div id="ticketStatus" class="info-box" style="display:none; margin-top:10px;"></div>
      <div id="ticketPreview" class="card" style="margin-top:14px;"></div>
    </div>
    <div id="ticket-history" class="section" style="display:none;"></div>
  `;

  function renderPreview(){
    const canal = document.getElementById('ticketChannel').value;
    const nick = document.getElementById('ticketNick').value.trim() || 'visitante';
    const rg = document.getElementById('ticketRg').value.trim() || '00000000';
    const texto = document.getElementById('ticketText').value.trim() || 'Painel de ticket padrão';
    const img = document.getElementById('ticketImage').value.trim();
    const cor = document.getElementById('ticketColor').value;

    document.getElementById('ticketPreview').innerHTML = `
      <div class="card" style="border-left:4px solid ${cor};">
        <h3>#ticket-${nick}</h3>
        <p><strong>Canal:</strong> ${canal} / <strong>RG:</strong> ${rg}</p>
        <p>${texto}</p>
        ${img ? `<img src="${img}" style="max-width:100%; border-radius:8px; margin-top:8px;" onerror="this.style.display='none'"/>`: ''}
      </div>`;
  }

  function renderHistory(){
    const history = loadJson(STORAGE_TICKET_HISTORY, []);
    const out = history.length ? history.reverse().map(item => `
      <div class="card" style="margin-bottom:8px;">
        <h3>${item.channel} - ${item.ticket}</h3>
        <p><strong>${formatDateLocal(item.date)}</strong> | ${item.nick} | RG: ${item.rg}</p>
        <p>${item.text}</p>
        ${item.image ? `<img src="${item.image}" style="max-width:100%; border-radius:8px;">` : ''}
      </div>
    `).join('') : '<p class="no-members">Sem tickets ainda.</p>';
    document.getElementById('ticket-history').innerHTML = out;
  }

  document.getElementById('tab-create').addEventListener('click', ()=>{ document.getElementById('ticket-create').style.display='block'; document.getElementById('ticket-history').style.display='none'; tabActive('tab-create'); });
  document.getElementById('tab-history').addEventListener('click', ()=>{ document.getElementById('ticket-create').style.display='none'; document.getElementById('ticket-history').style.display='block'; tabActive('tab-history'); renderHistory(); });

  function tabActive(id){ document.querySelectorAll('.tab-btn').forEach(b=>b.classList.remove('active')); document.getElementById(id).classList.add('active'); }

  document.getElementById('ticketPreviewBtn').addEventListener('click', renderPreview);

  document.getElementById('ticketCreateBtn').addEventListener('click', ()=>{
    const nick = document.getElementById('ticketNick').value.trim();
    const rg = document.getElementById('ticketRg').value.trim();
    const text = document.getElementById('ticketText').value.trim();
    if(!nick || !rg || !text){
      showToast('Preencha Nick, RG e texto do painel.', 'error');
      return;
    }

    const ticket = `ticket-${nick.replace(/\s+/g, '-').toLowerCase()}`;
    const entry = {
      id: Date.now(),
      date: new Date().toISOString(),
      channel: document.getElementById('ticketChannel').value,
      ticket,
      nick,
      rg,
      text,
      image: document.getElementById('ticketImage').value.trim(),
      color: document.getElementById('ticketColor').value,
      createdBy: sessionStorage.getItem('loggedUser') || 'guest'
    };

    const history = loadJson(STORAGE_TICKET_HISTORY, []);
    history.push(entry);
    saveJson(STORAGE_TICKET_HISTORY, history);

    document.getElementById('ticketStatus').style.display = 'block';
    document.getElementById('ticketStatus').textContent = `Ticket ${ticket} criado no canal ${entry.channel} e enviado via bot. (Simulação)`;
    document.getElementById('ticketStatus').className = 'success-text';
    renderPreview();
    renderHistory();
    setTimeout(()=>document.getElementById('ticketStatus').style.display='none', 3500);
  });

  renderPreview();
  renderHistory();
}

function initMessagesPage(){
  if(!window.location.pathname.endsWith('mensagens.html')) return;
  const container = document.querySelector('.main');
  if(!container) return;

  const messageQueue = loadJson(STORAGE_MESSAGE_SCHEDULE, []);

  container.innerHTML = `
    <div class="page-header"><h1>Mensagens</h1><p>Envie mensagens para canais, cargos e PMs.</p></div>
    <div class="field"><label>Canal</label><select id="msgChannel"><option value="#geral">#geral</option><option value="#anuncios">#anuncios</option><option value="#suporte">#suporte</option></select></div>
    <div class="field"><label>Texto</label><textarea id="msgText" rows="3"></textarea></div>
    <div class="field"><label>Imagem (URL)</label><input id="msgImage" type="text" placeholder="https://..."></div>
    <div class="field"><label>Cor do painel</label><input id="msgColor" type="color" value="#2f92ff"></div>
    <div class="field"><label>Enviar para</label><select id="msgTarget"><option value="canal">Canal</option><option value="pv">Mensagem Privada (ID)</option><option value="cargo">Cargo</option></select></div>
    <div class="field" id="targetValueField"><label>Valor</label><input id="msgTargetValue" type="text" placeholder="Digite ID ou cargo"></div>
    <div class="field"><label>Agendar envio</label><input id="msgDate" type="datetime-local"></div>
    <button id="btnMessageSend" class="btn btn-primary">Enviar Agora</button>
    <button id="btnMessageSchedule" class="btn btn-secondary">Agendar Envio</button>
    <div id="msgStatus" class="info-box" style="display:none; margin-top:10px;"></div>
    <div id="msgPreview" class="card" style="margin-top:14px;"></div>
    <div class="page-header" style="margin-top:18px;"><h2>Filas e históricos programados</h2></div>
    <div id="msgHistory"></div>
  `;

  function renderMessagePreview(){
    const channel = document.getElementById('msgChannel').value;
    const text = document.getElementById('msgText').value.trim();
    const image = document.getElementById('msgImage').value.trim();
    const color = document.getElementById('msgColor').value;
    document.getElementById('msgPreview').innerHTML = `
      <div class="card" style="border-left:4px solid ${color};">
        <p><strong>${channel}</strong></p><p>${text}</p>
        ${image ? `<img src="${image}" style="max-width:100%;border-radius:8px;" onerror="this.style.display='none'"/>` : ''}
      </div>`;
  }

  function refreshHistory(){
    const data = loadJson(STORAGE_MESSAGE_SCHEDULE, []);
    if(!data.length){ document.getElementById('msgHistory').innerHTML='<p class="no-members">Nenhuma mensagem agendada/histórico.</p>'; return; }
    document.getElementById('msgHistory').innerHTML = data.slice().reverse().map(item=>`
      <div class="card" style="margin-bottom:8px;"><p>${formatDateLocal(item.createdAt)} - ${item.target === 'pv' ? 'PV' : item.target === 'cargo' ? 'Cargo' : 'Canal'}: ${item.targetValue || item.channel}</p><p>${item.text}</p></div>
    `).join('');
  }

  document.getElementById('msgChannel').addEventListener('change', renderMessagePreview);
  document.getElementById('msgText').addEventListener('input', renderMessagePreview);
  document.getElementById('msgImage').addEventListener('input', renderMessagePreview);
  document.getElementById('msgColor').addEventListener('input', renderMessagePreview);

  document.getElementById('msgTarget').addEventListener('change', (e)=>{
    const label = {canal:'Canal',pv:'ID do usuário',cargo:'Cargo'}[e.target.value];
    document.querySelector('#targetValueField label').textContent = label;
  });

  function doSend(scheduled){
    const queue = loadJson(STORAGE_MESSAGE_SCHEDULE, []);
    const msg = {
      id: Date.now(),
      createdAt: new Date().toISOString(),
      channel: document.getElementById('msgChannel').value,
      text: document.getElementById('msgText').value.trim(),
      image: document.getElementById('msgImage').value.trim(),
      color: document.getElementById('msgColor').value,
      target: document.getElementById('msgTarget').value,
      targetValue: document.getElementById('msgTargetValue').value.trim(),
      scheduledAt: scheduled,
      processed: !scheduled
    };

    if(!msg.text){ showToast('Texto obrigatório.', 'error'); return; }

    queue.push(msg);
    saveJson(STORAGE_MESSAGE_SCHEDULE, queue);
    renderMessagePreview(); refreshHistory();
    showToast(scheduled ? 'Mensagem agendada com sucesso.' : 'Mensagem enviada agora (simulação).', 'success');
  }

  document.getElementById('btnMessageSend').addEventListener('click', ()=>doSend(null));
  document.getElementById('btnMessageSchedule').addEventListener('click', ()=>{
    const dt = document.getElementById('msgDate').value;
    if(!dt){ showToast('Escolha data e hora para agendamento.', 'error'); return; }
    doSend(dt);
  });

  renderMessagePreview();
  refreshHistory();
}

function initConfigPage(){
  if(!window.location.pathname.endsWith('configuracoes.html')) return;
  const container = document.querySelector('.main');
  if(!container) return;

  const roleKey = document.getElementById('roleSelectContainer');
  container.innerHTML = `
    <div class="page-header"><h1>Configurações de Permissão</h1><p>Defina quais cargos podem acessar quais páginas.</p></div>
    <div class="field"><label>Cargo</label><select id="configRole"><option value="Dono">Dono</option><option value="Membro">Membro</option><option value="Diretor(a)">Diretor(a)</option><option value="Coordenador(a)">Coordenador(a)</option><option value="Administrador">Administrador</option><option value="Staff">Staff</option></select></div>
    <div class="field"><label><input type="checkbox" id="perm_registros"> Acessar Registros</label></div>
    <div class="field"><label><input type="checkbox" id="perm_sistema"> Acessar Sistema Administrativo</label></div>
    <div class="field"><label><input type="checkbox" id="perm_servidor"> Acessar Servidor</label></div>
    <div class="field"><label><input type="checkbox" id="perm_configuracoes"> Acessar Configurações</label></div>
    <div class="field"><label><input type="checkbox" id="perm_punicoes"> Acessar Punições</label></div>
    <button id="saveRolePerm" class="btn btn-primary">Salvar Permissões</button>
    <p id="roleMessage" class="info-box" style="display:none;margin-top:10px;"></p>
    <hr style="margin:20px 0; border-color:rgba(255,255,255,.14);" />
    <div class="page-header" style="margin-top:20px;"><h2>Gerenciar Contas e Cargos</h2><p>Atribua cargos e atualize funções de cada usuário.</p></div>
    <div class="field"><label>Novo cargo:</label><input type="text" id="newRoleName" placeholder="Digite cargo (ex: Médico, Assistente)" style="width: calc(100% - 120px); display:inline-block; margin-right:8px;" />
      <button id="addNewRole" class="btn btn-secondary" style="display:inline-block; vertical-align:middle;">Adicionar Cargo</button></div>
    <div id="accountManager"></div>
  `;

  function applyRoleData(){
    const role = document.getElementById('configRole').value;
    const perms = getRolePermissions(role);
    document.getElementById('perm_registros').checked = !!perms.registros;
    document.getElementById('perm_sistema').checked = !!perms.sistemaAdministrativo;
    document.getElementById('perm_servidor').checked = !!perms.servidor;
    document.getElementById('perm_configuracoes').checked = !!perms.configuracoes;
    document.getElementById('perm_punicoes').checked = !!perms.punicoes;
  }

  document.getElementById('configRole').addEventListener('change', applyRoleData);

  function renderAccountManager(){
    const accounts = loadJson('accounts', []);
    const manager = document.getElementById('accountManager');
    if(!manager) return;

    if(!accounts.length){
      manager.innerHTML = '<div class="info-box">Nenhuma conta cadastrada no sistema. O primeiro usuário será o Dono e terá acesso total.</div>';
      return;
    }

    const rows = accounts.map((acc, idx) => {
      const availableRoles = ['Membro','Diretor(a)','Coordenador(a)','Dono','Administrador','Staff'];
      const options = availableRoles.map(r=>`<option value="${r}" ${acc.role===r ? 'selected' : ''}>${r}</option>`).join('');
      return `
        <div class="card" style="padding:10px; margin-bottom:8px; background:rgba(255,255,255,.06); border:1px solid rgba(255,255,255,.12);">
          <strong>${acc.username}</strong> <span style="color:#8de4ff;">(${acc.discord || 'sem discord'})</span><br>
          Cargo: <select data-account-index="${idx}" class="role-select" style="margin-top:6px; padding:4px;">${options}</select>
          <button class="btn btn-secondary save-role-btn" data-account-index="${idx}" style="margin-left:8px;">Salvar</button>
        </div>
      `;
    }).join('');

    manager.innerHTML = `
      <div style="margin-top:12px;">${rows}</div>
    `;

    const saveButtons = manager.querySelectorAll('.save-role-btn');
    saveButtons.forEach(btn => btn.addEventListener('click', (ev)=>{
      const idx = Number(ev.target.dataset.accountIndex);
      const select = manager.querySelector(`select[data-account-index="${idx}"]`);
      const newRole = select ? select.value : null;
      if(newRole){
        accounts[idx].role = newRole;
        saveJson('accounts', accounts);
        showToast(`Cargo de ${accounts[idx].username} atualizado para ${newRole}.`, 'success');
      }
    }));
  }

  document.getElementById('addNewRole').addEventListener('click', ()=>{
    const newRole = document.getElementById('newRoleName').value.trim();
    if(!newRole){
      showToast('Digite um nome de cargo válido.', 'error');
      return;
    }
    const cfgRole = document.getElementById('configRole');
    if([...cfgRole.options].some(o => o.value.toLowerCase() === newRole.toLowerCase())){
      showToast('Cargo já existe.', 'error');
      return;
    }
    const opt = document.createElement('option');
    opt.value = newRole;
    opt.textContent = newRole;
    cfgRole.appendChild(opt);
    document.getElementById('newRoleName').value = '';
    showToast(`Cargo ${newRole} adicionado à lista.`, 'success');
  });

  document.getElementById('saveRolePerm').addEventListener('click', ()=>{
    const role = document.getElementById('configRole').value;
    const all = loadJson(STORAGE_ROLE_PERMISSIONS, {});
    all[role] = {
      inicio: true,
      minhaConta: true,
      membros: true,
      registros: document.getElementById('perm_registros').checked,
      sistemaAdministrativo: document.getElementById('perm_sistema').checked,
      tickets: true,
      mensagens: true,
      servidor: document.getElementById('perm_servidor').checked,
      configuracoes: document.getElementById('perm_configuracoes').checked,
      entradaSaida: true,
      punicoes: document.getElementById('perm_punicoes').checked
    };
    saveJson(STORAGE_ROLE_PERMISSIONS, all);
    const msg = document.getElementById('roleMessage');
    msg.style.display='block'; msg.textContent='Permissões atualizadas com sucesso.';
    setTimeout(()=>msg.style.display='none', 2600);
  });

  applyRoleData();
  renderAccountManager();
}

function initMembersPage(){
  if(!window.location.pathname.endsWith('membros.html')) return;
  const connected = loadJson('discord_connected_members', []);
  const grid = document.getElementById('members-grid');
  if(!grid) return;

  if(!connected.length){
    grid.innerHTML = '<div class="no-members"><p>Nenhum membro do Discord conectado. Clique em atualizar para simular conexão.</p><button class="btn btn-primary" onclick="window.location.reload()">Atualizar</button></div>';
    return;
  }

  const cards = connected.map(member=>`
    <div class="member-card">
      <div class="member-status ${member.online ? 'online' : 'offline'}"></div>
      <img src="${member.avatar || 'images/logo_new.png'}" class="member-avatar" />
      <div class="member-name">${member.name}</div>
      <div class="member-role">${member.roles.join(', ') || 'Sem cargo'}</div>
      <div class="member-server">${member.server}</div>
    </div>
  `).join('');
  grid.innerHTML = cards;
}

function initSite(){
  ensureResponsiveMenu();
  setupMenuToggle();
  applyRoleProtection();
  initTicketPage();
  initMessagesPage();
  initConfigPage();
  initMembersPage();
}

window.addEventListener('DOMContentLoaded', initSite);

