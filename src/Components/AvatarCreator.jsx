import { useEffect, useRef } from 'react'
import { AvaturnSDK } from '@avaturn/sdk'

function AvatarCreator({ onAvatarExported }) {
  const containerRef = useRef(null)

  useEffect(() => {
    const subdomain = 'gameregistrationapp'
    const url = `https://${subdomain}.avaturn.dev`

    const sdk = new AvaturnSDK()

    sdk.init(containerRef.current, { url }).then(() => {
      sdk.on('export', (data) => {
        console.log('Avatar exported:', data)
        onAvatarExported(data.url)
      })
    })

    // Cleanup when component unmounts
    return () => {
      if (sdk && sdk.destroy) {
        sdk.destroy()
      }
    }
  }, [onAvatarExported])

  return (
    <div
      ref={containerRef}
      style={{ width: '100%', height: '600px', borderRadius: '12px', overflow: 'hidden' }}
    />
  )
}

export default AvatarCreator