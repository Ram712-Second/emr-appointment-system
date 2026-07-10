import { cn } from '@/lib/utils'

export interface NotificationProps {
  type?: 'success' | 'error' | 'warning' | 'info'
  title?: string
  message: string
  onClose?: () => void
  className?: string
}

/**
 * Notification Component
 * Displays alert messages with different types
 */
export function Notification({
  type = 'info',
  title,
  message,
  onClose,
  className,
}: NotificationProps) {
  const typeStyles = {
    success: 'bg-green-50 border-green-200 text-green-800',
    error: 'bg-red-50 border-red-200 text-red-800',
    warning: 'bg-yellow-50 border-yellow-200 text-yellow-800',
    info: 'bg-blue-50 border-blue-200 text-blue-800',
  }

  const iconMap = {
    success: '✓',
    error: '✕',
    warning: '⚠',
    info: 'ⓘ',
  }

  return (
    <div
      className={cn(
        'rounded-lg border p-4 shadow-sm',
        typeStyles[type],
        className
      )}
      role="alert"
    >
      <div className="flex items-start">
        <div className="flex-shrink-0 text-xl">{iconMap[type]}</div>
        <div className="ml-3 flex-1">
          {title && (
            <h3 className="text-sm font-medium mb-1">{title}</h3>
          )}
          <p className="text-sm">{message}</p>
        </div>
        {onClose && (
          <button
            onClick={onClose}
            className="ml-3 flex-shrink-0 inline-flex rounded-md p-1.5 hover:bg-black/5 focus:outline-none focus:ring-2 focus:ring-offset-2"
          >
            <span className="sr-only">Close</span>
            <span className="text-lg leading-none">×</span>
          </button>
        )}
      </div>
    </div>
  )
}
