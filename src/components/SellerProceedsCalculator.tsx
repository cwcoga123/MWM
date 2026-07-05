import { useMemo, useState } from 'react'
import { ArrowLeft, CircleDollarSign, Printer, RotateCcw } from 'lucide-react'
import { calculateSellerProceeds, conicGradient } from '../lib/sellerProceeds'

interface SellerProceedsCalculatorProps {
  onBack: () => void
}

const currency = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  maximumFractionDigits: 0,
})

function safeNumber(value: number) {
  return Number.isFinite(value) ? Math.max(0, value) : 0
}

interface MoneyFieldProps {
  id: string
  label: string
  value: number
  onChange: (value: number) => void
}

function MoneyField({ id, label, value, onChange }: MoneyFieldProps) {
  const [focused, setFocused] = useState(false)
  const displayValue = focused ? (value === 0 ? '' : String(value)) : (value === 0 ? '' : value.toLocaleString('en-US'))
  return (
    <label className="mortgage-field" htmlFor={id}>
      <span>{label}</span>
      <span className="mortgage-input">
        <span className="mortgage-input__prefix" aria-hidden="true">$</span>
        <input
          id={id}
          type="text"
          inputMode="decimal"
          value={displayValue}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          onChange={(event) => onChange(safeNumber(Number(event.target.value.replace(/,/g, ''))))}
        />
      </span>
    </label>
  )
}

const DEFAULTS = {
  salePrice: 1_250_000,
  outstandingMortgage: 125_000,
  buyerAgentFee: 13_500,
  sellerAgentFee: 13_500,
  titleEscrowTax: 4_500,
  sellerConcessions: 5_000,
  repairsPrep: 2_500,
  otherExpenses: 1_000,
}

export function SellerProceedsCalculator({ onBack }: SellerProceedsCalculatorProps) {
  const [salePrice, setSalePrice] = useState(DEFAULTS.salePrice)
  const [outstandingMortgage, setOutstandingMortgage] = useState(DEFAULTS.outstandingMortgage)
  const [buyerAgentFee, setBuyerAgentFee] = useState(DEFAULTS.buyerAgentFee)
  const [sellerAgentFee, setSellerAgentFee] = useState(DEFAULTS.sellerAgentFee)
  const [titleEscrowTax, setTitleEscrowTax] = useState(DEFAULTS.titleEscrowTax)
  const [sellerConcessions, setSellerConcessions] = useState(DEFAULTS.sellerConcessions)
  const [repairsPrep, setRepairsPrep] = useState(DEFAULTS.repairsPrep)
  const [otherExpenses, setOtherExpenses] = useState(DEFAULTS.otherExpenses)
  const [showAdvanced, setShowAdvanced] = useState(true)

  const result = useMemo(
    () =>
      calculateSellerProceeds({
        salePrice,
        outstandingMortgage,
        buyerAgentFee,
        sellerAgentFee,
        titleEscrowTax,
        sellerConcessions,
        repairsPrep,
        otherExpenses,
      }),
    [
      salePrice,
      outstandingMortgage,
      buyerAgentFee,
      sellerAgentFee,
      titleEscrowTax,
      sellerConcessions,
      repairsPrep,
      otherExpenses,
    ],
  )

  const isShortfall = result.netProceeds < 0
  const donutSegments = result.segments.filter((segment) => segment.amount > 0)
  const gradient = conicGradient(result.segments)

  function resetCalculator() {
    setSalePrice(DEFAULTS.salePrice)
    setOutstandingMortgage(DEFAULTS.outstandingMortgage)
    setBuyerAgentFee(DEFAULTS.buyerAgentFee)
    setSellerAgentFee(DEFAULTS.sellerAgentFee)
    setTitleEscrowTax(DEFAULTS.titleEscrowTax)
    setSellerConcessions(DEFAULTS.sellerConcessions)
    setRepairsPrep(DEFAULTS.repairsPrep)
    setOtherExpenses(DEFAULTS.otherExpenses)
  }

  return (
    <main className="mortgage-page seller-proceeds-page" id="seller-net-proceeds">
      <div className="mortgage-breadcrumb">
        <button type="button" onClick={onBack}>
          <ArrowLeft size={16} /> All calculators
        </button>
        <div className="mortgage-actions">
          <button type="button" onClick={resetCalculator}>
            <RotateCcw size={15} /> Reset
          </button>
          <button type="button" onClick={() => window.print()}>
            <Printer size={15} /> Print
          </button>
        </div>
      </div>

      <header className="mortgage-heading">
        <div className="mortgage-heading__icon"><CircleDollarSign size={24} /></div>
        <div>
          <p className="eyebrow">BUYING & SELLING</p>
          <h1>Seller's net proceeds</h1>
          <p>How much money a seller can expect to receive from a sale after subtracting costs.</p>
        </div>
      </header>

      <section className="seller-proceeds-panel">
        <div className="seller-proceeds-panel__heading">
          <h2>Seller proceeds calculator</h2>
          <p>Input sale price and amount paid.</p>
        </div>

        <div className="mortgage-expense-grid">
          <MoneyField id="sp-sale-price" label="Sale price" value={salePrice} onChange={setSalePrice} />
          <MoneyField
            id="sp-outstanding-mortgage"
            label="Outstanding mortgage balance"
            value={outstandingMortgage}
            onChange={setOutstandingMortgage}
          />
        </div>

        <p className="seller-proceeds-note">
          You can increase the accuracy of this calculator by filling in additional fields.
        </p>

        {showAdvanced && (
          <div className="seller-proceeds-advanced">
            <div className="seller-proceeds-advanced-grid">
              <MoneyField id="sp-buyer-agent" label="Buyer agent fee" value={buyerAgentFee} onChange={setBuyerAgentFee} />
              <MoneyField id="sp-seller-agent" label="Seller agent fee" value={sellerAgentFee} onChange={setSellerAgentFee} />
              <MoneyField id="sp-title-escrow" label="Title / escrow / tax" value={titleEscrowTax} onChange={setTitleEscrowTax} />
              <MoneyField id="sp-concessions" label="Seller concessions" value={sellerConcessions} onChange={setSellerConcessions} />
            </div>
            <div className="mortgage-expense-grid">
              <MoneyField id="sp-repairs" label="Repairs & prep" value={repairsPrep} onChange={setRepairsPrep} />
              <MoneyField id="sp-other" label="Other expenses" value={otherExpenses} onChange={setOtherExpenses} />
            </div>
          </div>
        )}

        <div className="seller-proceeds-toggle-row">
          <button type="button" className="seller-proceeds-toggle" onClick={() => setShowAdvanced((current) => !current)}>
            {showAdvanced ? 'Hide advanced controls' : 'Show advanced controls'}
          </button>
        </div>

        <div className="seller-proceeds-divider" />

        <div className="seller-proceeds-result">
          <p className="seller-proceeds-result__lede">Based off of the information you've provided us&hellip;</p>
          <h3>{isShortfall ? 'Estimated shortfall at closing' : 'Estimated proceeds of sale'}</h3>
          <p className={`seller-proceeds-result__amount ${isShortfall ? 'is-shortfall' : ''}`}>
            {currency.format(Math.abs(result.netProceeds))}
          </p>
          {isShortfall && (
            <p className="seller-proceeds-warning">
              Costs exceed the sale price — you may need to bring cash to closing to cover the difference.
            </p>
          )}
        </div>

        <div className="seller-proceeds-chart">
          <div className="seller-proceeds-donut" style={{ background: `conic-gradient(${gradient})` }}>
            <div className="seller-proceeds-donut__hole">
              <span>Net proceeds</span>
              <strong>{currency.format(Math.max(0, result.netProceeds))}</strong>
            </div>
          </div>

          <ul className="seller-proceeds-legend">
            {donutSegments.map((segment) => (
              <li key={segment.id}>
                <i style={{ background: segment.color }} />
                <span>{segment.label}</span>
                <strong>{currency.format(segment.amount)}</strong>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <p className="mortgage-disclaimer">
        Results are estimates for educational purposes only and do not account for prorated
        taxes, HOA dues, or every possible closing fee. Actual net proceeds will vary by
        transaction and location.
      </p>
    </main>
  )
}
