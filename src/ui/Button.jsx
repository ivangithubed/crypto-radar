const VARIANTS = {
  primary: "bg-brand text-on-brand",
  secondary: "bg-surface-raised text-brand border border-line-strong",
  ghost: "text-brand hover:underline",
};

/**
 * Кнопка дизайн-системи (UX §9.3). Решта props — атрибути `<button>`; `type` за замовчуванням "button".
 * `aria-disabled="true"` блокує дію, але лишає кнопку у фокусі (UX §3.1 «Спробувати ще раз»).
 * @param {{variant?: 'primary' | 'secondary' | 'ghost', children?: import('react').ReactNode} & Record<string, unknown>} props
 * @returns {import('react').ReactElement}
 */
export function Button({
  variant = "primary",
  type = "button",
  className = "",
  onClick,
  children,
  ref,
  ...rest
}) {
  const blocked = rest["aria-disabled"] === true || rest["aria-disabled"] === "true";
  const handleClick = (event) => {
    if (blocked) {
      event.preventDefault();
      return;
    }
    if (typeof onClick === "function") onClick(event);
  };
  const state = blocked ? "cursor-not-allowed opacity-55" : "cursor-pointer";
  return (
    <button
      ref={ref}
      type={type}
      {...rest}
      onClick={handleClick}
      className={`inline-flex min-h-11 items-center justify-center rounded-sm px-4 py-2.5 font-sans text-base leading-6 font-semibold focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus ${VARIANTS[variant] ?? VARIANTS.primary} ${state} ${className}`}
    >
      {children}
    </button>
  );
}
