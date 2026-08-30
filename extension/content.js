function pageRuntimeStatus() {
  return new Promise(resolve => {
    const listener = event => { document.removeEventListener('agentbridge:runtime-status', listener); resolve(event.detail || { status: 'UNSUPPORTED', tools: [] }); };
    document.addEventListener('agentbridge:runtime-status', listener, { once: true });
    document.dispatchEvent(new CustomEvent('agentbridge:extension-request', { detail: { type: 'runtime-status' } }));
    setTimeout(() => { document.removeEventListener('agentbridge:runtime-status', listener); resolve({ status: 'UNSUPPORTED', tools: [] }); }, 500);
  });
}

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message.type === 'GET_WEBMCP_STATUS') { pageRuntimeStatus().then(sendResponse); return true; }
  if (message.type === 'POLICY_UPDATED') {
    document.dispatchEvent(new CustomEvent('agentbridge:extension-request', { detail: { type: 'policy-updated' } }));
    sendResponse({ ok: true });
  }
});
