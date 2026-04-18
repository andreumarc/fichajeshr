export function ImpulsoDentIcon({
  size = 40,
  bg = '#003A70',
  className,
}: {
  size?: number
  bg?: string
  className?: string
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 40 40"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      <rect width="40" height="40" rx="9" fill={bg} />
      {/* Crown */}
      <path
        d="M8 19C8 10 12 7 16 7Q20 6 24 7C28 7 32 10 32 19Q28 22 20 22Q12 22 8 19Z"
        fill="white"
        fillOpacity="0.95"
      />
      {/* Left root */}
      <path
        d="M10 22H16V34C16 36 14.5 37 13 37C11.5 37 10 36 10 34Z"
        fill="white"
        fillOpacity="0.95"
      />
      {/* Right root */}
      <path
        d="M24 22H30V34C30 36 28.5 37 27 37C25.5 37 24 36 24 34Z"
        fill="white"
        fillOpacity="0.95"
      />
    </svg>
  )
}
