import { Download, Share, X } from 'lucide-react'
import { usePwaInstall } from '@/hooks/usePwaInstall'

export function PwaInstallButton({
  variant = 'ghost',
  className = '',
}: {
  variant?: 'ghost' | 'primary' | 'card'
  className?: string
}) {
  const { canInstall, showIosHint, isIos, installed, install, dismissIosHint } =
    usePwaInstall()

  if (installed) return null

  const btnClass =
    variant === 'primary'
      ? 'btn-primary'
      : variant === 'card'
        ? 'btn-ghost pwa-install-card-btn'
        : 'btn-ghost'

  return (
    <div className={`pwa-install ${className}`.trim()}>
      {canInstall || isIos ? (
        <button type="button" className={btnClass} onClick={() => void install()}>
          <Download size={15} />
          აპის დაყენება
        </button>
      ) : (
        <p className="muted pwa-install-tip">
          Chrome: მისამართის ზოლში ⊞ / მენიუ → <strong>Install app</strong>.
          Safari (iPhone): Share → Add to Home Screen.
        </p>
      )}

      {showIosHint && (
        <div className="pwa-ios-hint" role="status">
          <button
            type="button"
            className="pwa-ios-hint-close"
            aria-label="დახურვა"
            onClick={dismissIosHint}
          >
            <X size={14} />
          </button>
          <p>
            დააჭირე <Share size={14} className="pwa-ios-share-icon" /> Share, შემდეგ{' '}
            <strong>Add to Home Screen</strong>.
          </p>
        </div>
      )}
    </div>
  )
}
