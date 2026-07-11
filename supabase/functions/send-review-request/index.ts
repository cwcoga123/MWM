type ReviewDocument = {
  title?: string
  required?: boolean
  files?: Array<{
    name?: string
    size?: number
    type?: string
  }>
}

type ReviewRequestPayload = {
  advisorName?: string
  clientName?: string
  clientEmail?: string
  requiredUploaded?: number
  requiredTotal?: number
  totalUploaded?: number
  totalItems?: number
  documents?: ReviewDocument[]
}

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

function text(value: unknown, fallback = 'Unknown') {
  return typeof value === 'string' && value.trim() ? value.trim() : fallback
}

function numberText(value: unknown, fallback = 0) {
  return typeof value === 'number' && Number.isFinite(value) ? String(value) : String(fallback)
}

function formatDocuments(documents: ReviewDocument[] | undefined) {
  const uploaded = documents
    ?.filter((document) => document.files?.length)
    .map((document) => {
      const files = document.files?.map((file) => text(file.name, 'Unnamed file')).join(', ')
      return `- ${text(document.title)}: ${files}`
    })

  const missingRequired = documents
    ?.filter((document) => document.required && !document.files?.length)
    .map((document) => `- ${text(document.title)}`)

  return {
    uploaded: uploaded?.length ? uploaded.join('\n') : '- None yet',
    missingRequired: missingRequired?.length ? missingRequired.join('\n') : '- None',
  }
}

function buildEmail(payload: ReviewRequestPayload) {
  const advisorName = text(payload.advisorName, 'Advisor')
  const clientName = text(payload.clientName, 'Client')
  const clientEmail = text(payload.clientEmail, 'No email provided')
  const documents = formatDocuments(payload.documents)

  const subject = `MWM Client Hub - ${clientName} is ready for pre-approval review`
  const body = [
    `Hi ${advisorName},`,
    '',
    'The client is ready to review their pre-approval readiness checklist.',
    '',
    `Client: ${clientName}`,
    `Email: ${clientEmail}`,
    `Required documents uploaded: ${numberText(payload.requiredUploaded)}/${numberText(payload.requiredTotal)}`,
    `Total document groups uploaded: ${numberText(payload.totalUploaded)}/${numberText(payload.totalItems)}`,
    '',
    'Uploaded documents:',
    documents.uploaded,
    '',
    'Missing required documents:',
    documents.missingRequired,
    '',
    'Sent from the MWM Client Hub',
  ].join('\n')

  return { subject, body }
}

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  if (request.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  const resendApiKey = Deno.env.get('RESEND_API_KEY')
  const to = Deno.env.get('ADVISOR_REVIEW_EMAIL')
  const from = Deno.env.get('REVIEW_EMAIL_FROM') ?? 'MWM Client Hub <onboarding@resend.dev>'

  if (!resendApiKey || !to) {
    return new Response(JSON.stringify({ error: 'Email service is not configured' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  const payload = await request.json() as ReviewRequestPayload
  const email = buildEmail(payload)

  const resendResponse = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${resendApiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from,
      to,
      subject: email.subject,
      text: email.body,
    }),
  })

  if (!resendResponse.ok) {
    return new Response(JSON.stringify({ error: 'Email provider rejected the request' }), {
      status: 502,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  return new Response(JSON.stringify({ ok: true }), {
    status: 200,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
})
