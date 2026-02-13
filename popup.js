let items = JSON.parse(localStorage.getItem('items') || '[{"id":1,"url":"twitter.com","category":"social","blocked":true,"added":"2024-01-15"},{"id":2,"url":"reddit.com","category":"social","blocked":true,"added":"2024-01-16"},{"id":3,"url":"cnn.com","category":"news","blocked":true,"added":"2024-01-17"},{"id":4,"url":"amazon.com","category":"shopping","blocked":true,"added":"2024-01-18"},{"id":5,"url":"facebook.com","category":"social","blocked":false,"added":"2024-01-19"},{"id":6,"url":"ebay.com","category":"shopping","blocked":true,"added":"2024-01-20"}]');

let currentFilter = 'all';
let timerInterval = null;
let secondsRemaining = 1500;
let isTimerRunning = false;

const HOURLY_RATE = 120000 / 2080;
const RECOVERY_MINUTES = 23;

document.addEventListener('DOMContentLoaded', () => {
  renderItems();
  updateCostDisplay();
  setupEventListeners();
});

function setupEventListeners() {
  document.getElementById('addForm').addEventListener('submit', handleAdd);
  document.getElementById('settingsBtn').addEventListener('click', openSettings);
  document.getElementById('startTimerBtn').addEventListener('click', toggleTimer);
  document.getElementById('clearCompletedBtn').addEventListener('click', clearUnblocked);
  
  document.querySelectorAll('.filter-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
      e.target.classList.add('active');
      currentFilter = e.target.dataset.filter;
      renderItems();
    });
  });
}

function handleAdd(e) {
  e.preventDefault();
  const input = document.getElementById('siteInput');
  const select = document.getElementById('categorySelect');
  const submitBtn = document.getElementById('submitBtn');
  
  let url = input.value.trim().toLowerCase();
  url = url.replace(/^https?:\/\//, '').replace(/^www\./, '').split('/')[0];
  
  if (!url || !select.value) {
    showToast('Please fill in all fields', 'error');
    return;
  }
  
  if (items.some(item => item.url === url)) {
    showToast('Site already exists', 'error');
    return;
  }
  
  setLoading(true);
  
  setTimeout(() => {
    const newItem = {
      id: Date.now(),
      url: url,
      category: select.value,
      blocked: true,
      added: new Date().toISOString().split('T')[0]
    };
    
    items.unshift(newItem);
    localStorage.setItem('items', JSON.stringify(items));
    
    input.value = '';
    select.value = '';
    setLoading(false);
    renderItems();
    updateCostDisplay();
    showToast('Saved!', 'success');
  }, 300);
}

function deleteItem(id) {
  const element = document.querySelector(`[data-id="${id}"]`);
  if (element) {
    element.classList.add('removing');
    setTimeout(() => {
      items = items.filter(item => item.id !== id);
      localStorage.setItem('items', JSON.stringify(items));
      renderItems();
      updateCostDisplay();
      showToast('Deleted!', 'success');
    }, 300);
  }
}

function toggleItem(id) {
  const item = items.find(i => i.id === id);
  if (item) {
    item.blocked = !item.blocked;
    localStorage.setItem('items', JSON.stringify(items));
    renderItems();
    updateCostDisplay();
    showToast(item.blocked ? 'Site blocked' : 'Site unblocked', 'success');
  }
}

function clearUnblocked() {
  const initialCount = items.length;
  items = items.filter(item => item.blocked);
  if (items.length !== initialCount) {
    localStorage.setItem('items', JSON.stringify(items));
    renderItems();
    updateCostDisplay();
    showToast(`Cleared ${initialCount - items.length} unblocked sites`, 'success');
  } else {
    showToast('No unblocked sites to clear');
  }
}

function renderItems() {
  const container = document.getElementById('itemsList');
  const filteredItems = currentFilter === 'all' 
    ? items 
    : items.filter(item => item.category === currentFilter);
  
  if (filteredItems.length === 0) {
    container.innerHTML = `
      <div class="empty-state">
        <svg class="empty-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
          <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>
          <line x1="9" y1="9" x2="15" y2="15"/>
          <line x1="15" y1="9" x2="9" y2="15"/>
        </svg>
        <div class="empty-title">No items yet</div>
        <div class="empty-subtitle">Add your first distraction to calculate costs</div>
      </div>
    `;
    return;
  }
  
  container.innerHTML = '';
  filteredItems.forEach(item => {
    const div = document.createElement('div');
    div.className = 'item';
    div.dataset.id = item.id;
    div.innerHTML = `
      <div class="item-info">
        <div class="item-url">${item.url}</div>
        <div class="item-meta">
          <span class="item-category category-${item.category}">${item.category}</span>
          <span>• Added ${item.added}</span>
        </div>
      </div>
      <div class="item-actions">
        <button class="btn-icon btn-toggle ${!item.blocked ? 'inactive' : ''}" onclick="toggleItem(${item.id})" title="${item.blocked ? 'Unblock' : 'Block'}">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            ${item.blocked 
              ? '<rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>' 
              : '<rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 9.9-1"/>'}
          </svg>
        </button>
        <button class="btn-icon" onclick="deleteItem(${item.id})" title="Delete">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <polyline points="3 6 5 6 21 6"/>
            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
          </svg>
        </button>
      </div>
    `;
    container.appendChild(div);
  });
}

function updateCostDisplay() {
  const blockedCount = items.filter(i => i.blocked).length;
  const costPerSwitch = (HOURLY_RATE / 60) * RECOVERY_MINUTES;
  const totalCost = blockedCount * costPerSwitch;
  document.getElementById('costValue').textContent = '$' + totalCost.toFixed(2);
}

function toggleTimer() {
  const btn = document.getElementById('startTimerBtn');
  const status = document.getElementById('timerStatus');
  
  if (isTimerRunning) {
    clearInterval(timerInterval);
    isTimerRunning = false;
    btn.textContent = 'Resume Session';
    status.textContent = 'Paused';
    status.style.color = '#f97316';
    showToast('Session paused');
  } else {
    isTimerRunning = true;
    btn.textContent = 'Pause Session';
    status.textContent = 'Deep work in progress...';
    status.style.color = '#10b981';
    showToast('Focus session started!', 'success');
    
    timerInterval = setInterval(() => {
      secondsRemaining--;
      updateTimerDisplay();
      if (secondsRemaining <= 0) {
        clearInterval(timerInterval);
        isTimerRunning = false;
        btn.textContent = 'Start Deep Work Session';
        status.textContent = 'Session complete!';
        status.style.color = '#059669';
        secondsRemaining = 1500;
        showToast('Great job! Session complete.', 'success');
      }
    }, 1000);
  }
}

function updateTimerDisplay() {
  const minutes = Math.floor(secondsRemaining / 60);
  const seconds = secondsRemaining % 60;
  document.getElementById('timerDisplay').textContent = 
    `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
}

function openSettings() {
  showToast('Settings: Configure salary in options page');
}

function setLoading(isLoading) {
  const overlay = document.getElementById('loadingOverlay');
  const btn = document.getElementById('submitBtn');
  if (isLoading) {
    overlay.classList.add('show');
    btn.classList.add('loading');
  } else {
    overlay.classList.remove('show');
    btn.classList.remove('loading');
  }
}

function showToast(message, type = 'default') {
  const toast = document.getElementById('toast');
  toast.textContent = message;
  toast.className = 'toast show';
  if (type === 'error') toast.classList.add('error');
  if (type === 'success') toast.classList.add('success');
  
  setTimeout(() => {
    toast.classList.remove('show');
  }, 2500);
}

window.deleteItem = deleteItem;
window.toggleItem = toggleItem;