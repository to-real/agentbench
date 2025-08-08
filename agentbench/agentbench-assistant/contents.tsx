import { useEffect } from 'react'
import { createRoot } from 'react-dom/client'

// Create a simple content script to communicate with the main app
const ContentScript = () => {
  useEffect(() => {
    // Listen for messages from the extension popup
    const handleMessage = (event: MessageEvent) => {
      if (event.source === window && event.data.type === 'AGENTBENCH_SYNC') {
        // Forward message to the main app if it's running
        window.postMessage({
          type: 'AGENTBENCH_FROM_EXTENSION',
          payload: event.data.payload
        }, '*')
      }
    }

    window.addEventListener('message', handleMessage)

    // Notify the extension that the content script is ready
    window.postMessage({
      type: 'AGENTBENCH_CONTENT_SCRIPT_READY'
    }, '*')

    return () => {
      window.removeEventListener('message', handleMessage)
    }
  }, [])

  return null
}

// Create a container for the content script
const container = document.createElement('div')
container.id = 'agentbench-content-script'
document.body.appendChild(container)

// Render the content script
const root = createRoot(container)
root.render(<ContentScript />)

export default ContentScript