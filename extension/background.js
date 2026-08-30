importScripts('config.js');
const API_BASE = AGENTBRIDGE_API_BASE;

async function api(path, options = {}) {
  const response = await fetch(API_BASE + path, {
    headers: { 'Content-Type': 'application/json', ...(options.headers || {}) },
    ...options
  });
  const body = await response.json();
  if (!response.ok) throw new Error(body.error || 'AgentBridge could not complete that request.');
  return body;
}

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message.type === 'GET_LATEST_WEBMCP_SCAN') {
    chrome.storage.session.get('agentbridgeLastWebMcpScan').then(data => sendResponse({ ok: true, result: data.agentbridgeLastWebMcpScan || null }));
    return true;
  }
  if (message.type !== 'AGENTBRIDGE_API') return;
  api(message.path, message.options).then(body => sendResponse({ ok: true, body }), error => sendResponse({ ok: false, error: error.message }));
  return true;
});
