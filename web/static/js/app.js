// LinkForge Dashboard JavaScript
(function() {
  'use strict';

  const form = document.getElementById('shortenForm');
  const resultDiv = document.getElementById('result');
  const urlInput = document.getElementById('urlInput');
  const customCode = document.getElementById('customCode');

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const url = urlInput.value.trim();
    if (!url) return;

    try {
      const resp = await fetch('/api/shorten', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          url: url,
          custom_code: customCode.value.trim() || undefined
        })
      });

      const data = await resp.json();
      if (resp.ok) {
        resultDiv.innerHTML = `
          <div>✅ Shortened!</div>
          <a href="${data.short_url}" target="_blank">${data.short_url}</a>
          <button onclick="copyToClipboard('${data.short_url}')" style="margin-left:1rem;padding:0.3rem 0.6rem;background:var(--accent);color:white;border:none;border-radius:4px;cursor:pointer;">Copy</button>
        `;
        resultDiv.classList.remove('hidden');
        urlInput.value = '';
        customCode.value = '';
        // Refresh page after a short delay to show new link
        setTimeout(() => location.reload(), 1500);
      } else {
        resultDiv.innerHTML = `<div style="color:var(--danger)">❌ ${data.error}</div>`;
        resultDiv.classList.remove('hidden');
      }
    } catch (err) {
      resultDiv.innerHTML = `<div style="color:var(--danger)">❌ Network error</div>`;
      resultDiv.classList.remove('hidden');
    }
  });

  // Global functions
  window.copyToClipboard = function(text) {
    navigator.clipboard.writeText(text).then(() => {
      const btn = event.target;
      btn.textContent = 'Copied!';
      setTimeout(() => btn.textContent = 'Copy', 2000);
    });
  };

  window.deleteLink = async function(code) {
    if (!confirm(`Delete link "${code}"?`)) return;
    try {
      const resp = await fetch(`/api/links/${code}`, { method: 'DELETE' });
      if (resp.ok) {
        location.reload();
      } else {
        alert('Failed to delete');
      }
    } catch (err) {
      alert('Network error');
    }
  };

  // Auto-refresh stats every 30s
  setInterval(async () => {
    try {
      const resp = await fetch('/api/stats');
      if (resp.ok) {
        const data = await resp.json();
        const cards = document.querySelectorAll('.stat-value');
        if (cards[0]) cards[0].textContent = data.engine?.total_links ?? '0';
        if (cards[1]) cards[1].textContent = data.analytics?.total_clicks ?? '0';
        if (cards[2]) cards[2].textContent = data.engine?.unique_urls ?? '0';
      }
    } catch (e) {}
  }, 30000);
})();
