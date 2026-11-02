import { TermHint } from "../../glossary/index.js";
import { formatMarketCap, formatPrice } from "../../lib/index.js";
import { CoinIdentity } from "./CoinIdentity.jsx";
import { ChangeValue, FavoriteStar } from "./CoinParts.jsx";

const TH = "bg-surface-sunken px-3 py-2 text-left text-sm leading-5 font-semibold text-ink-muted";
const TD = "border-t border-line px-3 py-2.5 align-middle";

function Header({ term, label, right = false }) {
  return (
    <th scope="col" className={`${TH} ${right ? "text-right" : ""}`}>
      <span className="inline-flex items-center gap-1 whitespace-nowrap">
        {label}
        {term ? <TermHint term={term} /> : null}
      </span>
    </th>
  );
}

/**
 * Таблиця монет для екранів від 768 px; підказки до термінів — у заголовках колонок.
 * @param {{coins: import('../../lib/index.js').Coin[], caption: string, stableIds: Set<string>,
 *   isFavorite: (id: string) => boolean, onToggle: (coin: import('../../lib/index.js').Coin) => void}} props
 * @returns {import('react').ReactElement}
 */
export function CoinTable({ coins, caption, stableIds, isFavorite, onToggle }) {
  return (
    <table className="w-full border-collapse overflow-hidden rounded-md border border-line bg-surface-raised">
      <caption className="sr-only">{caption}</caption>
      <thead>
        <tr>
          <Header term="rank" label="№" />
          <Header term="ticker" label="Монета · тікер" />
          <Header label="Ціна" right />
          <Header term="change7d" label="Зміна за 7 днів" right />
          <Header term="marketCap" label="Капіталізація" right />
          <th scope="col" className={TH}>
            <span className="sr-only">Обрані</span>
          </th>
        </tr>
      </thead>
      <tbody>
        {coins.map((coin, index) => (
          <tr key={coin.id}>
            <td className={`${TD} text-sm text-ink-muted tabular-nums`}>{coin.rank}</td>
            <td className={TD}>
              <CoinIdentity coin={coin} index={index} isStable={stableIds.has(coin.id)} />
            </td>
            <td className={`${TD} text-right font-medium text-ink tabular-nums`}>
              {formatPrice(coin.priceUsd)}
            </td>
            <td className={`${TD} text-right`}>
              <ChangeValue pct={coin.change7dPct} />
            </td>
            <td className={`${TD} text-right font-medium text-ink tabular-nums`}>
              {formatMarketCap(coin.marketCapUsd)}
            </td>
            <td className={TD}>
              <FavoriteStar
                name={coin.name}
                isFavorite={isFavorite(coin.id)}
                onToggle={() => onToggle(coin)}
              />
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
