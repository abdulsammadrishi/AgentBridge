function pageRuntimeStatus() {
  return new Promise(resolve => {
    const listener = event => { document.removeEventListener('agentbridge:runtime-status', listener); resolve(event.detail || { status: 'UNSUPPORTED', tools: [] }); };
    document.addEventListener('agentbridge:runtime-status', listener, { once: true });
    document.dispatchEvent(new CustomEvent('agentbridge:extension-request', { detail: { type: 'runtime-status' } }));
    setTimeout(() => { document.removeEventListener('agentbridge:runtime-status', listener); resolve({ status: 'UNSUPPORTED', tools: [] }); }, 500);
  });
}

function publishAdminScan(result) {
  document.dispatchEvent(new CustomEvent('agentbridge:admin-scan-result', { detail: result || null }));
}

document.addEventListener('agentbridge:admin-scan-request', () => {
  chrome.runtime.sendMessage({ type: 'GET_LATEST_WEBMCP_SCAN' }, response => publishAdminScan(response?.result));
});

chrome.storage.onChanged.addListener((changes, area) => {
  if (area === 'session' && changes.agentbridgeLastWebMcpScan) publishAdminScan(changes.agentbridgeLastWebMcpScan.newValue);
});

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message.type === 'GET_WEBMCP_STATUS') { pageRuntimeStatus().then(sendResponse); return true; }
  if (message.type === 'POLICY_UPDATED') {
    document.dispatchEvent(new CustomEvent('agentbridge:extension-request', { detail: { type: 'policy-updated' } }));
    sendResponse({ ok: true });
  }
  if (message.type === 'ADMIN_SCAN_RESULT') { publishAdminScan(message.result); sendResponse({ ok: true }); }
});
