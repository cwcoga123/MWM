import type { LucideIcon } from 'lucide-react'
import {
  Banknote,
  ChartNoAxesCombined,
  CircleDollarSign,
  Columns3,
  HandCoins,
  House,
  KeyRound,
  Landmark,
  Percent,
  ReceiptText,
  Scale,
  TrendingUp,
  WalletCards,
} from 'lucide-react'

export type CalculatorStatus = 'ready' | 'planned'

export interface CalculatorItem {
  id: string
  title: string
  description: string
  category: 'Mortgage & financing' | 'Buying & selling' | 'Property insights'
  icon: LucideIcon
  featured?: boolean
}

export const calculators: CalculatorItem[] = [
  {
    id: 'mortgage-calculator',
    title: 'Mortgage calculator',
    description: 'Estimate monthly principal, interest, taxes, and insurance.',
    category: 'Mortgage & financing',
    icon: House,
    featured: true,
  },
  {
    id: 'amortization-schedule',
    title: 'Amortization schedule',
    description: 'See how every payment reduces principal over the life of a loan.',
    category: 'Mortgage & financing',
    icon: ChartNoAxesCombined,
  },
  {
    id: 'cash-out-refinance',
    title: 'Cash-out refinance',
    description: 'Compare available equity, a new payment, and estimated cash at closing.',
    category: 'Mortgage & financing',
    icon: HandCoins,
  
  },
  {
    id: 'affordability',
    title: 'Affordability',
    description: 'Explore a comfortable purchase range based on income and monthly debts.',
    category: 'Mortgage & financing',
    icon: WalletCards,
  },
  {
    id: 'loan-comparison',
    title: 'Loan comparison',
    description: 'Compare loan structures, rates, fees, and long-term interest side by side.',
    category: 'Mortgage & financing',
    icon: Columns3,
  },
  {
    id: 'mortgage-rates',
    title: 'Mortgage rates',
    description: 'Understand how rate changes affect monthly payment and buying power.',
    category: 'Mortgage & financing',
    icon: Percent,
  },
  {
    id: 'rent-vs-buy',
    title: 'Rent vs. buy',
    description: 'Model the cost and equity tradeoffs of renting versus owning.',
    category: 'Buying & selling',
    icon: Scale,
  },
  {
    id: 'seller-net-proceeds',
    title: 'Seller’s net proceeds',
    description: 'Estimate what remains after payoff, fees, credits, and closing costs.',
    category: 'Buying & selling',
    icon: CircleDollarSign,
  },
  {
    id: 'buyer-closing-costs',
    title: 'Buyer’s closing costs',
    description: 'Plan for lender fees, prepaid expenses, and cash needed to close.',
    category: 'Buying & selling',
    icon: ReceiptText,
  },
  {
    id: 'down-payment',
    title: 'Down payment planner',
    description: 'Compare down payment options and the effect on cash reserves.',
    category: 'Buying & selling',
    icon: Banknote,
  },
  {
    id: 'home-equity',
    title: 'Home equity',
    description: 'Estimate current equity and model future appreciation scenarios.',
    category: 'Property insights',
    icon: TrendingUp,
  },
  {
    id: 'investment-property',
    title: 'Investment property',
    description: 'Model operating income, expenses, cash flow, and cash-on-cash return.',
    category: 'Property insights',
    icon: Landmark,
  },
  {
    id: 'refinance-break-even',
    title: 'Refinance break-even',
    description: 'Find the point when monthly savings recover refinance costs.',
    category: 'Property insights',
    icon: KeyRound,
  },
]

export const categories = [
  'Mortgage & financing',
  'Buying & selling',
  'Property insights',
] as const
