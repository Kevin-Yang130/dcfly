export function DCFlyLogo({ className = "h-7 w-7" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 32 32"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden="true"
    >
      <rect
        x="0.75"
        y="0.75"
        width="30.5"
        height="30.5"
        rx="7.25"
        fill="var(--accent)"
      />
      <path
        d="M8 22 L13 16 L17 19 L24 10"
        stroke="var(--paper-elevated, #fdfbf7)"
        strokeWidth="2.25"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle
        cx="24"
        cy="10"
        r="2"
        fill="var(--paper-elevated, #fdfbf7)"
      />
    </svg>
  );
}
