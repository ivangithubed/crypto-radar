import { useState } from "react";

const SIZES = {
  24: "size-6 text-xs leading-6",
  40: "size-10 text-base leading-10",
};

/**
 * Логотип монети (декоративний, `alt=""`). Без адреси або якщо зображення не завантажилось — кружок `brand-soft`
 * з першою літерою назви, без повідомлення (UX §8, BUG-009).
 * @param {{url?: string, name: string, size?: 24 | 40, lazy?: boolean}} props
 * @returns {import('react').ReactElement}
 */
export function CoinLogo({ url = "", name, size = 24, lazy = false }) {
  const [failedUrl, setFailedUrl] = useState(/** @type {string | null} */ (null));
  if (url === "" || failedUrl === url) {
    return (
      <span
        aria-hidden="true"
        data-logo-fallback=""
        className={`${SIZES[size]} shrink-0 rounded-full bg-brand-soft text-center font-semibold text-brand`}
      >
        {name.slice(0, 1).toUpperCase()}
      </span>
    );
  }
  return (
    <img
      src={url}
      alt=""
      width={size}
      height={size}
      loading={lazy ? "lazy" : undefined}
      onError={() => setFailedUrl(url)}
      className={`${SIZES[size]} shrink-0 rounded-full`}
    />
  );
}
