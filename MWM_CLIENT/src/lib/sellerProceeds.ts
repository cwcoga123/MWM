export interface SellerProceedsInputs {
  salePrice: number
  outstandingMortgage: number
  buyerAgentFee: number
  sellerAgentFee: number
  titleEscrowTax: number
  /** Documentary transfer tax (county + city), tracked separately from title/escrow fees. */
  transferTax: number
  sellerConcessions: number
  repairsPrep: number
  otherExpenses: number
}

export interface SellerProceedsSegment {
  id: string
  label: string
  amount: number
  color: string
}

export interface SellerProceedsResult {
  totalCosts: number
  netProceeds: number
  segments: SellerProceedsSegment[]
}

function safeNumber(value: number) {
  return Number.isFinite(value) ? Math.max(0, value) : 0
}

/**
 * Straightforward walk-down from sale price to net proceeds: every additional
 * field is a dollar-for-dollar deduction. Matches the reference tool's
 * arithmetic exactly (verified: $1,250,000 sale, $125,000 payoff, and the
 * five closing-cost fields reduce to $1,085,000 net proceeds).
 */
export function calculateSellerProceeds(inputs: SellerProceedsInputs): SellerProceedsResult {
  const salePrice = safeNumber(inputs.salePrice)
  const outstandingMortgage = safeNumber(inputs.outstandingMortgage)
  const buyerAgentFee = safeNumber(inputs.buyerAgentFee)
  const sellerAgentFee = safeNumber(inputs.sellerAgentFee)
  const titleEscrowTax = safeNumber(inputs.titleEscrowTax)
  const transferTax = safeNumber(inputs.transferTax)
  const sellerConcessions = safeNumber(inputs.sellerConcessions)
  const repairsPrep = safeNumber(inputs.repairsPrep)
  const otherExpenses = safeNumber(inputs.otherExpenses)

  const totalCosts =
    outstandingMortgage +
    buyerAgentFee +
    sellerAgentFee +
    titleEscrowTax +
    transferTax +
    sellerConcessions +
    repairsPrep +
    otherExpenses

  const netProceeds = salePrice - totalCosts

  const segments: SellerProceedsSegment[] = [
    { id: 'proceeds', label: 'Net proceeds', amount: Math.max(0, netProceeds), color: '#3fb950' },
    { id: 'mortgage', label: 'Outstanding mortgage', amount: outstandingMortgage, color: '#2f81f7' },
    { id: 'buyer-agent', label: 'Buyer agent fee', amount: buyerAgentFee, color: '#f0883e' },
    { id: 'seller-agent', label: 'Seller agent fee', amount: sellerAgentFee, color: '#d9c02a' },
    { id: 'title-escrow', label: 'Title / escrow fees', amount: titleEscrowTax, color: '#a371f7' },
    { id: 'transfer-tax', label: 'Transfer tax', amount: transferTax, color: '#79c0ff' },
    { id: 'concessions', label: 'Seller concessions', amount: sellerConcessions, color: '#f778ba' },
    { id: 'repairs', label: 'Repairs & prep', amount: repairsPrep, color: '#ff7b72' },
    { id: 'other', label: 'Other expenses', amount: otherExpenses, color: '#8b949e' },
  ]

  return { totalCosts, netProceeds, segments }
}

/** Builds a CSS conic-gradient stop list from non-zero segments. */
export function conicGradient(segments: SellerProceedsSegment[]) {
  const positive = segments.filter((segment) => segment.amount > 0)
  const total = positive.reduce((sum, segment) => sum + segment.amount, 0)

  if (total <= 0) return `${segments[0]?.color ?? '#3fb950'} 0% 100%`

  let cumulative = 0
  const stops = positive.map((segment) => {
    const start = (cumulative / total) * 100
    cumulative += segment.amount
    const end = (cumulative / total) * 100
    return `${segment.color} ${start.toFixed(3)}% ${end.toFixed(3)}%`
  })

  return stops.join(', ')
}
