import React from "react";

type PencilIconProps = {
  className?: string;
  title?: string;
  onClick?: (e: React.MouseEvent) => void;
  role?: string;
};

export const PencilIcon: React.FC<PencilIconProps> = ({ className = "", title = "Edit", onClick, role = "button" }) => {
  return (
    <button
      onClick={onClick}
      title={title}
      aria-label={title}
      role={role}
      className={`inline-flex items-center justify-center p-1 rounded-md hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors ${className}`}
    >
      <svg
        xmlns="http://www.w3.org/2000/svg"
        className="w-4 h-4 text-gray-600 dark:text-gray-300"
        viewBox="0 0 20 20"
        fill="currentColor"
        aria-hidden="true"
      >
        <path d="M17.414 2.586a2 2 0 00-2.828 0L7 10.172V13h2.828l7.586-7.586a2 2 0 000-2.828z" />
        <path d="M2 15a1 1 0 011-1h2.586l8-8L14 4.586l-8 8V14a1 1 0 01-1 1H3a1 1 0 01-1-1v-1z" />
      </svg>
    </button>
  );
};

export default PencilIcon;
