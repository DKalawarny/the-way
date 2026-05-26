export const KinwoveStar = ({ size = 24, color = 'currentColor', ...props }) => (
  <svg
    width={size}
    height={size}
    viewBox="5 0 14 24"
    xmlns="http://www.w3.org/2000/svg"
    aria-hidden="true"
    {...props}
  >
    <path
      fill={color}
      d="M12,0 C12.8,5.5 16.5,9.5 19,12 C16.5,14.5 12.8,18.5 12,24 C11.2,18.5 7.5,14.5 5,12 C7.5,9.5 11.2,5.5 12,0 Z"
    />
  </svg>
);
