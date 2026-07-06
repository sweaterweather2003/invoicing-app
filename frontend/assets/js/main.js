// Global functions
function getToken() {
  return localStorage.getItem('token');
}

async function apiRequest(url, options = {}) {
  const token = getToken();
  const res = await fetch(`/api${url}`, {
    headers: {
      'Content-Type': 'application/json',
      'Authorization': token ? `Bearer ${token}` : ''
    },
    ...options
  });
  return res.json();
}

function createNewDocument() {
  window.location.href = 'invoice.html';
}