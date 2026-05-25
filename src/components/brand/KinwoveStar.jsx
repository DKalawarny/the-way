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
      d="M12,0 C13.01,7.96 16.04,10.99 24,12 C16.04,13.01 13.01,16.04 12,24 C10.99,16.04 7.96,13.01 0,12 C7.96,10.99 10.99,7.96 12,0 Z"
    />
  </svg>
);
