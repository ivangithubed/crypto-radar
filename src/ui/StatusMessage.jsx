/**
 * Ввічлива жива область `role="status"`: присутня в DOM завжди, оголошує зміну `children` (WCAG 4.1.3).
 * @param {{children?: import('react').ReactNode, className?: string}} props
 * @returns {import('react').ReactElement}
 */
export function StatusMessage({ children = null, className = "" }) {
  return (
    <p role="status" className={className}>
      {children}
    </p>
  );
}
