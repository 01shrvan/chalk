export default function Mark({ size = 20 }: { size?: number }) {
  return (
    <svg
      className="mark"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
    >
      <rect width="24" height="24" rx="5" fill="#191c23" />
      <rect x="6.5" y="5" width="5" height="14" rx="1.4" fill="#fdfdfd" transform="rotate(-12 9 12)" />
      <path
        d="M13.5 17.5c2-5 5-7.4 6.6-6.6"
        stroke="#ffd166"
        strokeWidth="2.4"
        strokeLinecap="round"
      />
    </svg>
  );
}
