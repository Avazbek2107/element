export default function ElementLogo({ size = 72, color = '#16c94e', withText = false, textColor = '#111' }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
      <svg
        width={size}
        height={size}
        viewBox="0 0 100 100"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        {/*
          Tashqi katta yoy: (28,16) dan soat yo'nalishi bo'yicha (76,72) gacha
          O'ng tomoni ochiq — klassik "э" shakli
        */}
        <path
          d="M 28,16 A 37,37 0 1,1 76,72"
          stroke={color}
          strokeWidth="11.5"
          strokeLinecap="round"
          fill="none"
        />
        {/*
          Pastki spiral "dum": yoy ichi tomonga buriladi
        */}
        <path
          d="M 76,72 A 19,19 0 0,1 46,76"
          stroke={color}
          strokeWidth="11.5"
          strokeLinecap="round"
          fill="none"
        />
        {/* O'rta gorizontal chiziq */}
        <line
          x1="14" y1="50"
          x2="80" y2="50"
          stroke={color}
          strokeWidth="11.5"
          strokeLinecap="round"
        />
        {/* Yuqori dot — nuqta */}
        <circle cx="27" cy="16" r="7.5" fill={color} />
      </svg>

      {withText && (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
          <span style={{
            fontSize: size * 0.27,
            fontWeight: 700,
            letterSpacing: '0.1em',
            color: textColor,
            lineHeight: 1,
            fontFamily: 'system-ui, sans-serif',
          }}>
            element
          </span>
          <span style={{
            fontSize: size * 0.12,
            letterSpacing: '0.22em',
            color: '#aaa',
            textTransform: 'uppercase',
            lineHeight: 1,
            fontFamily: 'system-ui, sans-serif',
          }}>
            O'quv markazi
          </span>
        </div>
      )}
    </div>
  )
}
