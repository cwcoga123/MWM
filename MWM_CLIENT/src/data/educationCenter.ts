import type { LucideIcon } from 'lucide-react'
import {
  Banknote,
  CalendarClock,
  ClipboardCheck,
  DollarSign,
  FileText,
  KeyRound,
  Landmark,
  Search,
  ShieldCheck,
} from 'lucide-react'

export type EducationPillarId =
  | 'loan-financing'
  | 'escrow-closing'
  | 'title-ownership'
  | 'property-due-diligence'
  | 'money-taxes-costs'
  | 'safety-documents-signing'
  | 'post-closing-ownership'

export type EducationModuleId =
  | 'wire-safety'
  | 'escrow-101'
  | 'life-of-escrow'
  | 'loan-process-roadmap'
  | 'preliminary-title-report'
  | 'signing-appointment-prep'
  | 'closing-costs'
  | 'property-tax-calendar'

export interface EducationPillar {
  id: EducationPillarId
  title: string
  shortTitle: string
  summary: string
  modules: string[]
  v1ModuleIds: EducationModuleId[]
  icon: LucideIcon
}

export interface EducationCta {
  label: string
  href: string
  description: string
}

export interface EducationCard {
  label: string
  body: string
}

export interface EducationStep {
  title: string
  detail: string
}

export interface EducationModule {
  id: EducationModuleId
  pillarId: EducationPillarId
  title: string
  eyebrow: string
  duration: string
  formatLabel: string
  intro: string
  videoTitle: string
  icon: LucideIcon
  answers: {
    what: string
    why: string
    do: string
    ask: string
  }
  walkthroughTitle: string
  walkthrough: EducationStep[]
  checklistTitle: string
  checklist: string[]
  cardsTitle: string
  cards: EducationCard[]
  ctas?: EducationCta[]
}

export const educationPillars: EducationPillar[] = [
  {
    id: 'loan-financing',
    title: 'Loan & Financing',
    shortTitle: 'Loan',
    summary: 'From application through funding, with the lender decisions that affect timing and payment.',
    icon: Landmark,
    modules: [
      'Loan process roadmap',
      'Pre-approval readiness',
      'Loan documents and funding',
      'PMI made simple',
      'Rate locks and payment changes',
    ],
    v1ModuleIds: ['loan-process-roadmap'],
  },
  {
    id: 'escrow-closing',
    title: 'Escrow & Closing',
    shortTitle: 'Escrow',
    summary: 'What escrow coordinates, who is involved, and what happens before keys are released.',
    icon: ClipboardCheck,
    modules: ['Escrow 101', 'Life of escrow timeline', 'Opening escrow', 'Closing day sequence'],
    v1ModuleIds: ['escrow-101', 'life-of-escrow'],
  },
  {
    id: 'title-ownership',
    title: 'Title & Ownership',
    shortTitle: 'Title',
    summary: 'Title search, title insurance, vesting, and the ownership details that can delay a file.',
    icon: FileText,
    modules: [
      'Title insurance basics',
      'Life of a title search',
      'Preliminary title report',
      'Statement of Information',
      'Ways to hold title / vesting',
    ],
    v1ModuleIds: ['preliminary-title-report'],
  },
  {
    id: 'property-due-diligence',
    title: 'Property Due Diligence',
    shortTitle: 'Due Diligence',
    summary: 'The appraisal, inspection, disclosure, and warranty checks that inform contingency decisions.',
    icon: Search,
    modules: ['Appraisal', 'Home inspection', 'Home warranty', 'Natural hazard and disclosure reports'],
    v1ModuleIds: [],
  },
  {
    id: 'money-taxes-costs',
    title: 'Money, Taxes & Costs',
    shortTitle: 'Costs',
    summary: 'Cash to close, who pays what, California property tax dates, and tax topics to confirm early.',
    icon: DollarSign,
    modules: [
      'Closing costs and who pays what',
      'Cash to close',
      'Transfer taxes',
      'Property tax calendar',
      'Supplemental taxes',
      'Seller tax topics: FIRPTA, California withholding, capital gains basics',
    ],
    v1ModuleIds: ['closing-costs', 'property-tax-calendar'],
  },
  {
    id: 'safety-documents-signing',
    title: 'Safety, Documents & Signing',
    shortTitle: 'Signing',
    summary: 'Wire safety, signing preparation, IDs, notarization, and final document readiness.',
    icon: ShieldCheck,
    modules: ['Wire safety', 'Signing appointment prep', 'ID and notarization', 'Funds to close', 'Final document checklist'],
    v1ModuleIds: ['wire-safety', 'signing-appointment-prep'],
  },
  {
    id: 'post-closing-ownership',
    title: 'Post-Closing Ownership',
    shortTitle: 'Post-Close',
    summary: 'Recording, keys, title policy delivery, first tax dates, warranty next steps, and PMI awareness.',
    icon: KeyRound,
    modules: ['Recording and keys', 'Title policy delivery', 'First property tax dates', 'Home warranty next steps', 'PMI removal awareness'],
    v1ModuleIds: [],
  },
]

export const recommendedEducationModuleIds: EducationModuleId[] = [
  'wire-safety',
  'escrow-101',
  'life-of-escrow',
  'loan-process-roadmap',
  'preliminary-title-report',
  'signing-appointment-prep',
  'closing-costs',
  'property-tax-calendar',
]

export const educationModules: EducationModule[] = [
  {
    id: 'wire-safety',
    pillarId: 'safety-documents-signing',
    title: 'Wire Safety',
    eyebrow: 'Safety, Documents & Signing',
    duration: '2 min',
    formatLabel: 'Step-by-step flow',
    intro: 'A guided flow for sending closing funds without relying on changed instructions in email or text.',
    videoTitle: 'Advisor video placeholder: How we verify wire instructions',
    icon: ShieldCheck,
    answers: {
      what: 'Wire safety is the process for confirming where closing funds go before any money moves.',
      why: 'Real estate wire fraud often starts with a believable message that changes instructions at the last minute.',
      do: 'Call a verified phone number, confirm the receiving account, and send only after your advisor or escrow team confirms the process.',
      ask: 'Which phone number should I use to verify escrow instructions before I send funds?',
    },
    walkthroughTitle: 'Wire safety flow',
    walkthrough: [
      {
        title: 'Get instructions from escrow',
        detail: 'Use the secure escrow channel or in-person instructions. Treat email attachments as unverified until confirmed.',
      },
      {
        title: 'Verify by phone',
        detail: 'Call a known number from your opening package or advisor, not a number from a new message.',
      },
      {
        title: 'Send a test if directed',
        detail: 'Some escrow teams may ask for a small verification transfer. Follow only their confirmed process.',
      },
      {
        title: 'Confirm receipt',
        detail: 'Ask escrow to confirm funds arrived and keep the confirmation with your closing records.',
      },
    ],
    checklistTitle: 'Before you wire',
    checklist: [
      'Use a verified escrow phone number.',
      'Confirm bank name, routing number, account number, and beneficiary.',
      'Watch for changed instructions, urgency, or pressure.',
      'Ask escrow to confirm receipt after the wire is sent.',
    ],
    cardsTitle: 'Red flags',
    cards: [
      {
        label: 'Changed instructions',
        body: 'Treat any new account, new bank, or new contact as suspicious until escrow verifies it live.',
      },
      {
        label: 'Pressure to hurry',
        body: 'A real closing team can explain timing without pushing you to skip verification.',
      },
      {
        label: 'Personal check delays',
        body: 'Large funds usually need a wire or cashier check. Confirm acceptable forms before signing day.',
      },
    ],
  },
  {
    id: 'escrow-101',
    pillarId: 'escrow-closing',
    title: 'Escrow 101',
    eyebrow: 'Escrow & Closing',
    duration: '2 min',
    formatLabel: 'Role map',
    intro: 'A visual map of escrow as the neutral coordinator between buyer, seller, agents, lender, and title.',
    videoTitle: 'Advisor video placeholder: What escrow does after offer acceptance',
    icon: ClipboardCheck,
    answers: {
      what: 'Escrow is a neutral closing process that holds instructions, documents, and funds until the contract conditions are met.',
      why: 'It keeps each party moving from offer acceptance to recording with one coordinated closing file.',
      do: 'Respond quickly to escrow requests, sign opening documents, and keep your advisor copied on questions.',
      ask: 'Who is my escrow officer, and what should I expect from them this week?',
    },
    walkthroughTitle: 'Life of an escrow file',
    walkthrough: [
      {
        title: 'Offer accepted',
        detail: 'The purchase agreement sets the closing timeline, deposit amount, contingency dates, and who pays which costs.',
      },
      {
        title: 'Escrow opened',
        detail: 'Escrow collects contract instructions, deposit instructions, identity details, and initial disclosures.',
      },
      {
        title: 'Conditions cleared',
        detail: 'Loan, title, inspection, appraisal, and seller obligations are tracked until the file is ready to sign.',
      },
      {
        title: 'Close coordinated',
        detail: 'Escrow balances funds, gathers signatures, confirms funding, and coordinates recording with title.',
      },
    ],
    checklistTitle: 'Client actions',
    checklist: [
      'Return opening paperwork and Statement of Information promptly.',
      'Send the earnest money deposit through verified instructions.',
      'Track contingency dates with your advisor.',
      'Ask before sending sensitive documents by email.',
    ],
    cardsTitle: 'Who does what?',
    cards: [
      {
        label: 'Escrow officer',
        body: 'Coordinates documents, funds, signatures, and closing instructions.',
      },
      {
        label: 'Title officer',
        body: 'Reviews ownership history and clears title issues for transfer.',
      },
      {
        label: 'Lender',
        body: 'Underwrites the loan, prepares closing documents, and funds the loan.',
      },
    ],
  },
  {
    id: 'life-of-escrow',
    pillarId: 'escrow-closing',
    title: 'Life of Escrow',
    eyebrow: 'Escrow & Closing',
    duration: '3 min',
    formatLabel: 'Interactive roadmap',
    intro: 'A guided transaction timeline from offer accepted through keys, written for California purchase files.',
    videoTitle: 'Advisor video placeholder: The escrow timeline in plain English',
    icon: CalendarClock,
    answers: {
      what: 'The life of escrow is the sequence of coordinated steps between contract acceptance and official recording.',
      why: 'Knowing the sequence helps you understand which request is urgent and which step depends on another team.',
      do: 'Keep deposit, loan, inspection, signing, and funding dates visible so no decision point is missed.',
      ask: 'What are my next two escrow deadlines, and what could move them?',
    },
    walkthroughTitle: 'Escrow roadmap',
    walkthrough: [
      {
        title: 'Offer accepted',
        detail: 'Contract terms, closing date, deposit timing, and contingencies become the working roadmap.',
      },
      {
        title: 'Escrow opened',
        detail: 'The file is created, deposit instructions are issued, and opening documents go out.',
      },
      {
        title: 'Contingencies',
        detail: 'Inspection, appraisal, disclosures, title, and loan approval are reviewed before removal decisions.',
      },
      {
        title: 'Signing',
        detail: 'Loan and escrow documents are signed, usually before the legal closing date.',
      },
      {
        title: 'Funding and recording',
        detail: 'The lender funds, title records the deed, and escrow confirms the transaction has closed.',
      },
      {
        title: 'Keys',
        detail: 'Key release follows the contract and local practice after recording is confirmed.',
      },
    ],
    checklistTitle: 'At each phase',
    checklist: [
      'Confirm deposit timing and verified wire instructions.',
      'Review inspection, disclosure, title, and loan milestones.',
      'Schedule signing with current ID ready.',
      'Wait for recording confirmation before assuming closing is complete.',
    ],
    cardsTitle: 'Timeline notes',
    cards: [
      {
        label: 'Signing is early',
        body: 'Signing loan documents does not mean the home has closed. Funding and recording still need to happen.',
      },
      {
        label: 'Recording is official',
        body: 'In California, ownership transfer is confirmed when the deed records with the county.',
      },
      {
        label: 'Keys follow contract',
        body: 'Possession timing depends on the purchase agreement and escrow confirmation.',
      },
    ],
  },
  {
    id: 'loan-process-roadmap',
    pillarId: 'loan-financing',
    title: 'Loan Process Roadmap',
    eyebrow: 'Loan & Financing',
    duration: '3 min',
    formatLabel: 'Interactive timeline',
    intro: 'A short walkthrough of how a loan moves from application to funding and why lender requests keep changing.',
    videoTitle: 'Advisor video placeholder: What your lender needs and why',
    icon: Landmark,
    answers: {
      what: 'The loan process is the lender review of income, assets, credit, property value, title, insurance, and final closing numbers.',
      why: 'A clean loan file protects your closing date and helps avoid late conditions before signing.',
      do: 'Upload complete documents, avoid new debt, and answer lender conditions quickly.',
      ask: 'What conditions are still open, and could any of them affect my closing date or cash to close?',
    },
    walkthroughTitle: 'Loan timeline',
    walkthrough: [
      {
        title: 'Application',
        detail: 'The lender collects your starting profile and runs initial pricing, payment, and approval scenarios.',
      },
      {
        title: 'Documents',
        detail: 'Income, assets, ID, credit authorization, and property details are collected and checked.',
      },
      {
        title: 'Underwriting',
        detail: 'An underwriter validates the file and may ask for updated or clearer documentation.',
      },
      {
        title: 'Approval',
        detail: 'Conditions are cleared, final pricing is confirmed, and closing documents are prepared.',
      },
      {
        title: 'Signing and funding',
        detail: 'Documents are signed, final funds are confirmed, and the lender releases loan funds to escrow.',
      },
    ],
    checklistTitle: 'Keep your loan clean',
    checklist: [
      'Do not open new credit without asking the lender.',
      'Keep large deposits traceable.',
      'Send every page of requested statements.',
      'Confirm whether your rate is locked and when it expires.',
    ],
    cardsTitle: 'Payment watch points',
    cards: [
      {
        label: 'Rate lock',
        body: 'A lock protects a rate for a set period, but expiration dates and lock terms matter.',
      },
      {
        label: 'PMI',
        body: 'Private mortgage insurance may apply when down payment is below the lender threshold.',
      },
      {
        label: 'Cash to close',
        body: 'Your final cash number can shift as taxes, prepaid items, credits, and loan fees are finalized.',
      },
    ],
    ctas: [
      {
        label: 'Mortgage calculator',
        href: '#mortgage-calculator',
        description: 'Estimate payment with taxes and insurance.',
      },
      {
        label: 'Affordability',
        href: '#affordability',
        description: 'Pressure-test a comfortable purchase range.',
      },
      {
        label: 'Buyer closing costs',
        href: '#buyer-closing-costs',
        description: 'Plan estimated cash to close.',
      },
    ],
  },
  {
    id: 'preliminary-title-report',
    pillarId: 'title-ownership',
    title: 'Preliminary Title Report',
    eyebrow: 'Title & Ownership',
    duration: '3 min',
    formatLabel: 'Annotated sample',
    intro: 'A guided look at the title report sections buyers and sellers should recognize before closing.',
    videoTitle: 'Advisor video placeholder: Why title insurance exists',
    icon: FileText,
    answers: {
      what: 'A preliminary title report lists current ownership, legal description, liens, easements, taxes, and exceptions to title coverage.',
      why: 'It surfaces issues that may need clearing before the property can transfer cleanly.',
      do: 'Review owner names, property description, liens, easements, and unusual exceptions with your advisor.',
      ask: 'Are there any exceptions, liens, or vesting issues we should resolve before contingencies are removed?',
    },
    walkthroughTitle: 'Title report tour',
    walkthrough: [
      {
        title: 'Vesting and owner names',
        detail: 'Confirm the seller names match the contract and the people who must sign closing documents.',
      },
      {
        title: 'Legal description',
        detail: 'This is the formal property description, not just the street address.',
      },
      {
        title: 'Taxes and assessments',
        detail: 'County tax status and special assessments can affect prorations and post-closing bills.',
      },
      {
        title: 'Liens and loans',
        detail: 'Existing mortgages, judgments, or other liens usually need to be paid or cleared at closing.',
      },
      {
        title: 'Easements and exceptions',
        detail: 'These can describe access rights, utility rights, CC&Rs, or items not covered by the title policy.',
      },
    ],
    checklistTitle: 'Review before signing off',
    checklist: [
      'Confirm seller names and property address.',
      'Scan for liens, judgments, or unpaid taxes.',
      'Ask about easements, CC&Rs, and unusual exceptions.',
      'Confirm how you intend to hold title before final docs.',
    ],
    cardsTitle: 'Micro-reference',
    cards: [
      {
        label: 'Lien',
        body: 'A recorded claim against the property, often tied to a loan, judgment, or unpaid obligation.',
      },
      {
        label: 'Easement',
        body: 'A right for someone else to use part of the property for a specific purpose, such as utilities or access.',
      },
      {
        label: 'Vesting',
        body: 'The way ownership is held on title. Ask legal or tax counsel when ownership structure matters.',
      },
      {
        label: 'Legal description',
        body: 'The official description used in recorded documents. It can differ from a mailing address.',
      },
    ],
  },
  {
    id: 'signing-appointment-prep',
    pillarId: 'safety-documents-signing',
    title: 'Signing Appointment Prep',
    eyebrow: 'Safety, Documents & Signing',
    duration: '2 min',
    formatLabel: 'Checklist',
    intro: 'A practical checklist for signing loan and escrow documents without confusing signing with closing.',
    videoTitle: 'Advisor video placeholder: Signing is not the same as closing',
    icon: ClipboardCheck,
    answers: {
      what: 'The signing appointment is when required documents are notarized or signed before funding and recording.',
      why: 'Missing ID, funding confusion, or late document questions can push the closing sequence.',
      do: 'Bring valid ID, confirm your signing location, review final cash to close, and ask questions before signing.',
      ask: 'After I sign, what still has to happen before recording and keys?',
    },
    walkthroughTitle: 'Signing sequence',
    walkthrough: [
      {
        title: 'Schedule',
        detail: 'Confirm time, place, notary details, and whether all signers must appear together.',
      },
      {
        title: 'Bring ID',
        detail: 'Use current, acceptable identification that matches your closing documents.',
      },
      {
        title: 'Review documents',
        detail: 'Ask about payment, rate, vesting, names, and final funds before signing.',
      },
      {
        title: 'Fund and record',
        detail: 'After signing, escrow and lender still coordinate funding and county recording.',
      },
    ],
    checklistTitle: 'Bring to signing',
    checklist: [
      'Current government-issued ID.',
      'Escrow contact information.',
      'Confirmed funds-to-close plan.',
      'Questions about payment, rate, names, vesting, or closing timing.',
    ],
    cardsTitle: 'Common delays',
    cards: [
      {
        label: 'Missing ID',
        body: 'Expired or mismatched identification can stop notarization.',
      },
      {
        label: 'Funds confusion',
        body: 'Personal checks may not clear in time. Confirm acceptable funds with escrow.',
      },
      {
        label: 'Assuming it is closed',
        body: 'Signing starts the final sequence. Recording is the official closing milestone.',
      },
    ],
  },
  {
    id: 'closing-costs',
    pillarId: 'money-taxes-costs',
    title: 'Closing Costs',
    eyebrow: 'Money, Taxes & Costs',
    duration: '3 min',
    formatLabel: 'Cost sorter',
    intro: 'A buyer/seller cost sorter for California closing conversations, with a calculator shortcut for estimates.',
    videoTitle: 'Advisor video placeholder: What cash to close includes',
    icon: Banknote,
    answers: {
      what: 'Closing costs are the transaction, loan, title, escrow, tax, prepaid, and recording charges paid at closing.',
      why: 'They affect cash to close for buyers and net proceeds for sellers, and local custom can vary.',
      do: 'Review the estimate early, compare it with final escrow numbers, and ask which items are negotiable or custom-based.',
      ask: 'Which costs are fixed, which are estimates, and which are based on county or local custom?',
    },
    walkthroughTitle: 'Cost review flow',
    walkthrough: [
      {
        title: 'Estimate early',
        detail: 'Use a worksheet or calculator before writing or accepting an offer.',
      },
      {
        title: 'Sort by party',
        detail: 'Separate buyer costs, seller costs, shared items, and negotiated credits.',
      },
      {
        title: 'Check timing',
        detail: 'Prepaids, prorations, and payoff numbers can change close to signing.',
      },
      {
        title: 'Confirm final cash',
        detail: 'Escrow and lender reconcile the final amount before funds are sent.',
      },
    ],
    checklistTitle: 'Review these categories',
    checklist: [
      'Loan fees, points, appraisal, and credit report.',
      'Escrow, title, recording, and notary charges.',
      'Prepaid interest, insurance, taxes, and impounds.',
      'Seller payoff, commissions, transfer taxes, and negotiated credits.',
    ],
    cardsTitle: 'Ask your advisor',
    cards: [
      {
        label: 'Who usually pays?',
        body: 'California custom can vary by county and contract terms. Confirm before relying on a rule of thumb.',
      },
      {
        label: 'Cash to close',
        body: 'This includes down payment plus closing costs, adjusted for credits, deposit, and prorations.',
      },
      {
        label: 'Tax pro item',
        body: 'Ask your tax professional how any deduction, withholding, or capital gains issue applies to you.',
      },
    ],
    ctas: [
      {
        label: 'Buyer closing cost calculator',
        href: '#buyer-closing-costs',
        description: 'Estimate buyer-side lender, title, escrow, and prepaid costs.',
      },
      {
        label: 'Seller net proceeds',
        href: '#seller-net-proceeds',
        description: 'Estimate payoff, costs, and net after sale.',
      },
    ],
  },
  {
    id: 'property-tax-calendar',
    pillarId: 'money-taxes-costs',
    title: 'Property Tax Calendar',
    eyebrow: 'Money, Taxes & Costs',
    duration: '2 min',
    formatLabel: 'California calendar',
    intro: 'A California-focused property tax calendar covering regular installments and supplemental tax awareness.',
    videoTitle: 'Advisor video placeholder: First tax bills after a California closing',
    icon: CalendarClock,
    answers: {
      what: 'The property tax calendar tracks California regular tax bill dates, delinquency dates, and possible supplemental bills after a sale.',
      why: 'New owners can receive both regular and supplemental bills, and escrow impounds do not remove the need to watch mail.',
      do: 'Save the key dates, confirm whether your lender impounds taxes, and open every county tax notice after closing.',
      ask: 'Will my loan impound taxes, and should I expect a supplemental tax bill after closing?',
    },
    walkthroughTitle: 'California tax year',
    walkthrough: [
      {
        title: 'July 1',
        detail: 'California property tax year begins.',
      },
      {
        title: 'October',
        detail: 'Annual secured tax bills are commonly mailed by county tax collectors.',
      },
      {
        title: 'November 1',
        detail: 'First installment is due.',
      },
      {
        title: 'December 10',
        detail: 'First installment becomes delinquent after this date.',
      },
      {
        title: 'February 1',
        detail: 'Second installment is due.',
      },
      {
        title: 'April 10',
        detail: 'Second installment becomes delinquent after this date.',
      },
      {
        title: 'After reassessment',
        detail: 'A supplemental tax bill may arrive after a change in ownership or new construction.',
      },
    ],
    checklistTitle: 'New owner reminders',
    checklist: [
      'Confirm whether taxes are impounded by the lender.',
      'Watch for county mail after closing.',
      'Set calendar holds for December 10 and April 10.',
      'Ask about supplemental taxes if the purchase price is above the prior assessed value.',
    ],
    cardsTitle: 'Ask your tax pro',
    cards: [
      {
        label: 'Supplemental taxes',
        body: 'A separate bill can follow reassessment after ownership changes. Timing varies by county.',
      },
      {
        label: 'Impounds',
        body: 'A lender impound account collects for taxes and insurance, but county notices still matter.',
      },
      {
        label: 'Seller topics',
        body: 'FIRPTA, California withholding, and capital gains questions should be handled with tax counsel.',
      },
    ],
  },
]
