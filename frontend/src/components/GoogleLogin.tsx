import { useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import toast from 'react-hot-toast'

declare global {
  interface Window {
    google?: {
      accounts?: {
        id?: {
          initialize: (config: {
            client_id: string
            callback: (response: { credential: string }) => void
          }) => void
          renderButton: (
            parent: HTMLElement,
            options: {
              theme?: string
              size?: string
              width?: number
              text?: string
            }
          ) => void
        }
      }
    }
  }
}

export default function GoogleLogin() {
  const buttonRef = useRef<HTMLDivElement>(null)
  const { loginWithGoogle } = useAuth()
  const navigate = useNavigate()

  useEffect(() => {
    const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID
    if (!clientId) {
      console.warn('VITE_GOOGLE_CLIENT_ID not set — Google login disabled')
      return
    }

    // Wait for GIS script to load
    const checkGoogle = setInterval(() => {
      if (window.google?.accounts?.id) {
        clearInterval(checkGoogle)

        window.google.accounts.id.initialize({
          client_id: clientId,
          callback: async (response) => {
            try {
              await loginWithGoogle(response.credential)
              toast.success('Logged in with Google!')
              navigate('/')
            } catch {
              toast.error('Google login failed')
            }
          },
        })

        if (buttonRef.current) {
          window.google.accounts.id.renderButton(buttonRef.current, {
            theme: 'outline',
            size: 'large',
            width: buttonRef.current.offsetWidth || 300,
            text: 'continue_with',
          })
        }
      }
    }, 100)

    return () => clearInterval(checkGoogle)
  }, [loginWithGoogle])

  const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID
  if (!clientId) return null

  return (
    <div className="w-full">
      <div ref={buttonRef} className="w-full flex justify-center" />
    </div>
  )
}
