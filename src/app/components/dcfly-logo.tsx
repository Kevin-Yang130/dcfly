export function DCFlyLogo({ className = "h-8 w-8" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 100 100"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      {/* Outer circle - emerald */}
      <circle cx="50" cy="50" r="45" fill="#10b981" />
      
      {/* Inner design - upward trend arrow */}
      <path
        d="M30 65 L45 50 L55 58 L70 35"
        stroke="white"
        strokeWidth="6"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
      
      {/* Arrow head */}
      <path
        d="M70 35 L65 42 L70 35 L62 40"
        stroke="white"
        strokeWidth="6"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
      
      {/* Dollar sign */}
      <circle cx="50" cy="30" r="8" fill="white" opacity="0.9" />
      <text
        x="50"
        y="35"
        textAnchor="middle"
        fill="#10b981"
        fontSize="14"
        fontWeight="bold"
      >
        $
      </text>
    </svg>
  );
}
