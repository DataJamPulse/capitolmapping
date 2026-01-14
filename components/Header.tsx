'use client'

interface HeaderProps {
  selectedCount?: number
  onShareClick?: () => void
  isShareMode?: boolean
}

export default function Header({ selectedCount = 0, onShareClick, isShareMode = false }: HeaderProps) {
  return (
    <header className="bg-capitol-red text-white px-6 py-3 shadow-lg z-50">
      <div className="flex items-center justify-between max-w-full">
        {/* Logo */}
        <div className="flex items-center gap-4">
          <img
            src="/capitol-logo.webp"
            alt="Capitol Outdoor"
            className="h-12 w-auto"
          />
        </div>

        {/* Center Title */}
        <div className="hidden md:block">
          <h1 className="text-lg font-semibold text-white tracking-wide">
            {isShareMode ? 'Proposal View' : 'Interactive Inventory Map'}
          </h1>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-4">
          {!isShareMode && selectedCount > 0 && (
            <>
              <span className="text-sm text-white/80">
                <span className="font-bold text-white">{selectedCount}</span> unit{selectedCount !== 1 ? 's' : ''} selected
              </span>
              <button
                onClick={onShareClick}
                className="bg-white hover:bg-gray-100 text-capitol-red px-4 py-2 rounded-lg font-semibold transition-colors flex items-center gap-2"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
                </svg>
                Share
              </button>
            </>
          )}

          {isShareMode && (
            <a
              href="/"
              className="bg-white hover:bg-gray-100 text-capitol-red px-4 py-2 rounded-lg font-semibold transition-colors"
            >
              View All Units
            </a>
          )}
        </div>
      </div>
    </header>
  )
}
