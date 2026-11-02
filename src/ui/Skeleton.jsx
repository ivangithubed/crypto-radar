/**
 * Скелетон завантаження в розмір справжнього вмісту (CLS, NFR-4); прихований від зчитувача.
 * @param {{className?: string}} props
 * @returns {import('react').ReactElement}
 */
export function Skeleton({ className = "" }) {
  return (
    <div
      aria-hidden="true"
      className={`rounded-sm bg-surface-sunken motion-safe:animate-pulse ${className}`}
    />
  );
}
