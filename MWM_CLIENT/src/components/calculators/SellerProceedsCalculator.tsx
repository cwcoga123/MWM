import { useMemo, useState } from 'react'
import { ArrowLeft, CircleDollarSign, HelpCircle, Printer, RotateCcw } from 'lucide-react'
import { calculateSellerProceeds, conicGradient } from '../../lib/sellerProceeds'
import {
  CA_CLOSING_CUSTOMS_SOURCE,
  caClosingCustoms,
  cityTransferTaxAmount,
  countyCustomsFor,
  countyTransferTaxAmount,
  customaryShare,
  payerLabel,
} from '../../data/caClosingCustoms'
import { ShareWithAdvisor } from '../shared/ShareWithAdvisor'
import type { ShareSection } from '../../lib/share'

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

function FieldLabel({ label, help }: { label: string; help?: string }) {
  return (
    <span className="field-label">
      {label}
      {help && (
        <span className="field-help" aria-label={help}>
          <HelpCircle size={13} />
          <span className="field-help__tooltip">{help}</span>
        </span>
      )}
    </span>
  )
}

interface MoneyFieldProps {
  id: string
  label: string
  value: number
  onChange: (value: number) => void
  help?: string
}

function MoneyField({ id, label, value, onChange, help }: MoneyFieldProps) {
  const [focused, setFocused] = useState(false)
  const displayValue = focused ? (value === 0 ? '' : String(value)) : (value === 0 ? '' : value.toLocaleString('en-US'))
  return (
    <label className="mortgage-field" htmlFor={id}>
      <FieldLabel label={label} help={help} />
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

  const [county, setCounty] = useState('')
  const [city, setCity] = useState('')
  const [transferTaxOverride, setTransferTaxOverride] = useState<number | null>(null)

  const customs = county ? countyCustomsFor(county) : undefined
  const cityTax = customs?.cityTaxes?.find((entry) => entry.city === city)

  const suggestedTransferTax = useMemo(() => {
    if (!customs) return 0
    const countyTax = countyTransferTaxAmount(customs, salePrice)
    const cityAmount = cityTax ? cityTransferTaxAmount(cityTax, salePrice) : 0
    return Math.round(countyTax + customaryShare(cityTax?.payer ?? null, cityAmount, 'seller'))
  }, [customs, cityTax, salePrice])

  const transferTax = transferTaxOverride ?? suggestedTransferTax

  function changeCounty(nextCounty: string) {
    setCounty(nextCounty)
    setCity('')
    setTransferTaxOverride(null)
  }

  function changeCity(nextCity: string) {
    setCity(nextCity)
    setTransferTaxOverride(null)
  }

  const result = useMemo(
    () =>
      calculateSellerProceeds({
        salePrice,
        outstandingMortgage,
        buyerAgentFee,
        sellerAgentFee,
        titleEscrowTax,
        transferTax,
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
      transferTax,
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
    setCounty('')
    setCity('')
    setTransferTaxOverride(null)
  }

  function getShareSections(): ShareSection[] {
    return [
      {
        title: 'My inputs',
        entries: [
          { label: 'Sale price', value: currency.format(salePrice) },
          { label: 'Outstanding mortgage balance', value: currency.format(outstandingMortgage) },
          ...(county
            ? [{ label: 'Location', value: city ? `${city}, ${county} County, CA` : `${county} County, CA` }]
            : []),
          { label: 'Buyer agent fee', value: currency.format(buyerAgentFee) },
          { label: 'Seller agent fee', value: currency.format(sellerAgentFee) },
          { label: 'Title / escrow fees', value: currency.format(titleEscrowTax) },
          { label: 'Transfer tax', value: currency.format(transferTax) },
          { label: 'Seller concessions', value: currency.format(sellerConcessions) },
          { label: 'Repairs & prep', value: currency.format(repairsPrep) },
          { label: 'Other expenses', value: currency.format(otherExpenses) },
        ],
      },
      {
        title: 'Results',
        entries: [
          {
            label: isShortfall ? 'Estimated shortfall at closing' : 'Estimated net proceeds',
            value: currency.format(Math.abs(result.netProceeds)),
          },
        ],
      },
    ]
  }

  return (
    <main className="mortgage-page seller-proceeds-page" id="seller-net-proceeds">
      <div className="mortgage-breadcrumb">
        <button type="button" onClick={onBack}>
          <ArrowLeft size={16} /> All calculators
        </button>
        <div className="mortgage-actions">
          <ShareWithAdvisor tool="Seller's net proceeds" getSections={getShareSections} />
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
          <MoneyField
            id="sp-sale-price"
            label="Sale price"
            value={salePrice}
            onChange={setSalePrice}
            help="The price the home is expected to sell for."
          />
          <MoneyField
            id="sp-outstanding-mortgage"
            label="Outstanding mortgage balance"
            value={outstandingMortgage}
            onChange={setOutstandingMortgage}
            help="What you still owe on the mortgage — this gets paid off from the sale proceeds at closing."
          />
        </div>

        <div className="mortgage-expense-grid">
          <label className="mortgage-field" htmlFor="sp-county">
            <FieldLabel
              label="California county"
              help="Select the county to estimate the documentary transfer tax and see who customarily pays escrow, title, and transfer taxes there."
            />
            <span className="mortgage-select">
              <select id="sp-county" value={county} onChange={(event) => changeCounty(event.target.value)}>
                <option value="">Select county (optional)</option>
                {caClosingCustoms.map((entry) => (
                  <option value={entry.county} key={entry.county}>{entry.county}</option>
                ))}
              </select>
            </span>
          </label>
          {customs?.cityTaxes && customs.cityTaxes.length > 0 && (
            <label className="mortgage-field" htmlFor="sp-city">
              <FieldLabel
                label="City"
                help="Some cities charge their own transfer tax on top of the county's $1.10 per $1,000. Select the city if the property is inside its limits."
              />
              <span className="mortgage-select">
                <select id="sp-city" value={city} onChange={(event) => changeCity(event.target.value)}>
                  <option value="">No city transfer tax / other city</option>
                  {customs.cityTaxes.map((entry) => (
                    <option value={entry.city} key={entry.city}>{entry.city}</option>
                  ))}
                </select>
              </span>
            </label>
          )}
        </div>

        {customs && (
          <div className="mortgage-insight seller-proceeds-customs">
            <p>
              <strong>Customary practice in {customs.county} County:</strong>{' '}
              escrow fees — {payerLabel(customs.escrow)}{customs.escrowNote ? ` (${customs.escrowNote})` : ''};{' '}
              owner's title policy — {payerLabel(customs.title)}{customs.titleNote ? ` (${customs.titleNote})` : ''};{' '}
              county transfer tax — {customs.countyTransferTaxPerThousand > 0
                ? `seller pays $${customs.countyTransferTaxPerThousand.toFixed(2)} per $1,000`
                : 'see note'}{customs.countyTaxNote ? ` (${customs.countyTaxNote})` : ''}.
              {cityTax && (
                <>
                  {' '}{cityTax.city} city transfer tax — {payerLabel(cityTax.payer)}
                  {cityTax.note ? ` (${cityTax.note})` : ''}.
                </>
              )}
            </p>
          </div>
        )}

        <p className="seller-proceeds-note">
          You can increase the accuracy of this calculator by filling in additional fields.
        </p>

        {showAdvanced && (
          <div className="seller-proceeds-advanced">
            <div className="seller-proceeds-advanced-grid">
              <MoneyField
                id="sp-buyer-agent"
                label="Buyer agent fee"
                value={buyerAgentFee}
                onChange={setBuyerAgentFee}
                help="Commission paid to the buyer's agent, customarily covered by the seller out of sale proceeds."
              />
              <MoneyField
                id="sp-seller-agent"
                label="Seller agent fee"
                value={sellerAgentFee}
                onChange={setSellerAgentFee}
                help="Commission paid to your own listing agent for marketing and selling the home."
              />
              <MoneyField
                id="sp-title-escrow"
                label="Title / escrow fees"
                value={titleEscrowTax}
                onChange={setTitleEscrowTax}
                help="Owner's title insurance policy and escrow/settlement fees. Who customarily pays varies by county — select a county above to see the local practice."
              />
              <MoneyField
                id="sp-transfer-tax"
                label="Transfer tax"
                value={transferTax}
                onChange={(value) => setTransferTaxOverride(value)}
                help={
                  customs
                    ? `Auto-estimated from ${customs.county} County customs: $1.10 per $1,000 county tax${cityTax ? ` plus the seller's customary share of the ${cityTax.city} city tax` : ''}. Edit to override.`
                    : 'Documentary transfer tax charged when the deed records. In California the county tax is $1.10 per $1,000 of price, customarily paid by the seller; some cities add their own. Select a county above to auto-estimate.'
                }
              />
              <MoneyField
                id="sp-concessions"
                label="Seller concessions"
                value={sellerConcessions}
                onChange={setSellerConcessions}
                help="Credits you agree to give the buyer — e.g. toward closing costs or repairs — negotiated as part of the deal."
              />
            </div>
            <div className="mortgage-expense-grid">
              <MoneyField
                id="sp-repairs"
                label="Repairs & prep"
                value={repairsPrep}
                onChange={setRepairsPrep}
                help="Cost of repairs, staging, cleaning, or other work done to prepare the home for sale."
              />
              <MoneyField
                id="sp-other"
                label="Other expenses"
                value={otherExpenses}
                onChange={setOtherExpenses}
                help="Any other selling costs not covered above, such as HOA transfer fees or a home warranty."
              />
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
              <span>
                <FieldLabel label="Net proceeds" help="What you walk away with after the mortgage payoff and all selling costs are subtracted from the sale price." />
              </span>
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
        transaction and location. County customs source: {CA_CLOSING_CUSTOMS_SOURCE}
      </p>
    </main>
  )
}
