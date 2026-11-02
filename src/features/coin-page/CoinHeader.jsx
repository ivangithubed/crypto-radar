import { TermHint } from "../../glossary/index.js";

/**
 * Заголовок сторінки монети: логотип 40×40 (`alt=""`, лише з адресою), h1, тікер, мітка «Стейблкоїн», дія ★.
 * @param {{name: string, symbol?: string, imageUrl?: string, isStable?: boolean,
 *   h1Ref: import('react').Ref<HTMLHeadingElement>, children?: import('react').ReactNode}} props
 * @returns {import('react').ReactElement}
 */
export function CoinHeader({ name, symbol, imageUrl, isStable = false, h1Ref, children }) {
  return (
    <div className="flex flex-wrap items-center gap-3">
      {imageUrl ? (
        <img src={imageUrl} alt="" width="40" height="40" className="size-10 rounded-full" />
      ) : null}
      <h1
        ref={h1Ref}
        tabIndex={-1}
        className="m-0 font-display text-2xl leading-[30px] font-semibold"
      >
        {name}
      </h1>
      {symbol ? <span className="text-sm text-ink-muted">{symbol}</span> : null}
      {isStable ? (
        <span className="inline-flex items-center gap-1 text-sm leading-5 text-brand">
          Стейблкоїн
          <TermHint term="stablecoin" />
        </span>
      ) : null}
      {children ? <div className="ml-auto">{children}</div> : null}
    </div>
  );
}
