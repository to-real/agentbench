// Background script for handling cross-tab communication
chrome.runtime.onInstalled.addListener(() => {
  console.log('AgentBench Assistant installed')
})

// Listen for messages from content scripts or popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.type === 'AGENTBENCH_SYNC') {
    // Broadcast to all tabs
    chrome.tabs.query({}, (tabs) => {
      tabs.forEach(tab => {
        if (tab.id && tab.id !== sender.tab?.id) {
          chrome.tabs.sendMessage(tab.id, {
            type: 'AGENTBENCH_BROADCAST',
            payload: request.payload
          }).catch(() => {
            // Ignore errors for tabs that don't have content script
          })
        }
      })
    })
    sendResponse({ success: true })
  }

  if (request.type === 'AGENTBENCH_GET_TAB_INFO') {
    sendResponse({
      url: sender.tab?.url,
      title: sender.tab?.title,
      id: sender.tab?.id
    })
  }

  return true // Keep the message channel open for async responses
})

// Handle storage changes for configuration
chrome.storage.onChanged.addListener((changes, namespace) => {
  if (namespace === 'local') {
    if (changes.supabaseUrl || changes.supabaseKey) {
      // Notify all tabs about configuration changes
      chrome.tabs.query({}, (tabs) => {
        tabs.forEach(tab => {
          if (tab.id) {
            chrome.tabs.sendMessage(tab.id, {
              type: 'AGENTBENCH_CONFIG_CHANGED'
            }).catch(() => {
              // Ignore errors for tabs that don't have content script
            })
          }
        })
      })
    }
  }
})