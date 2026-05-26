export const KinwoveStar = ({ size = 24, color = 'currentColor', ...props }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    xmlns="http://www.w3.org/2000/svg"
    aria-hidden="true"
    {...props}
  >
    <path
      fill={color}
      d="M12 1 L13.4 9.6 L22 11 L13.4 12.4 L12 23 L10.6 12.4 L2 11 L10.6 9.6 Z"
    />
  </svg>
);
