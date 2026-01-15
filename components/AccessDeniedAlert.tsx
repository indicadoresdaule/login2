"use client"

import { useEffect } from "react"
import { X } from "lucide-react"

interface AccessDeniedAlertProps {
  message: string
  onClose: () => void
}

export default function AccessDeniedAlert({ message, onClose }: AccessDeniedAlertProps) {
  // Cerrar automáticamente después de 5 segundos
  useEffect(() => {
    const timer = setTimeout(() => {
      onClose()
    }, 5000)

    return () => clearTimeout(timer)
  }, [onClose])

  return (
    <div className="fixed top-4 right-4 z-50 max-w-md animate-in slide-in-from-top-5 duration-300">
      <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded-r-lg shadow-lg">
        <div className="flex items-center justify-between">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <div className="h-6 w-6 text-red-500">
                <svg fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
              </div>
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-red-800">Acceso Denegado</h3>
              <div className="mt-1 text-sm text-red-700">
                <p>{message}</p>
              </div>
            </div>
          </div>
          <button
            onClick={onClose}
            className="ml-4 flex-shrink-0 text-red-500 hover:text-red-700 focus:outline-none"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
      </div>
    </div>
  )
}
