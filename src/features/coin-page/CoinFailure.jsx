import { ErrorBlock } from "../../ui/index.js";
import { CoinHeader } from "./CoinHeader.jsx";

/**
 * Стан Error (UX §3 S-2): h1 (назва, якщо відома; інакше `coin.unavailable`) і блок помилки замість даних.
 * @param {{name?: string, kind: 'src' | 'net' | 'stale', onRetry: () => void, retrying: boolean, retryFailed: boolean,
 *   h1Ref: import('react').Ref<HTMLHeadingElement>}} props
 * @returns {import('react').ReactElement}
 */
export function CoinFailure({
  name = "Дані монети недоступні",
  kind,
  onRetry,
  retrying,
  retryFailed,
  h1Ref,
}) {
  return (
    <>
      <CoinHeader name={name} h1Ref={h1Ref} />
      <ErrorBlock kind={kind} onRetry={onRetry} retrying={retrying} retryFailed={retryFailed} />
    </>
  );
}
