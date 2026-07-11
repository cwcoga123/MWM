type AdvisorEmailPayload = {
  subject?: string
  message?: string
  clientName?: string
  clientEmail?: string
}

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

const MAX_SUBJECT_LENGTH = 200
const MAX_MESSAGE_LENGTH = 10_000

function cleanText(value: unknown, maxLength: number) {
  return typeof value === 'string' ? value.trim().slice(0, maxLength) : ''
}

function isEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)
}

function jsonResponse(status: number, body: Record<string, unknown>) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  if (request.method !== 'POST') {
    return jsonResponse(405, { error: 'Method not allowed' })
  }

  const resendApiKey = Deno.env.get('RESEND_API_KEY')
  const to = Deno.env.get('ADVISOR_EMAIL') ?? Deno.env.get('ADVISOR_REVIEW_EMAIL')
  const from =
    Deno.env.get('EMAIL_FROM') ??
    Deno.env.get('REVIEW_EMAIL_FROM') ??
    'MWM Client Hub <onboarding@resend.dev>'

  if (!resendApiKey || !to) {
    return jsonResponse(500, { error: 'Email service is not configured' })
  }

  let payload: AdvisorEmailPayload
  try {
    payload = (await request.json()) as AdvisorEmailPayload
  } catch {
    return jsonResponse(400, { error: 'Invalid JSON payload' })
  }

  const message = cleanText(payload.message, MAX_MESSAGE_LENGTH)
  if (!message) {
    return jsonResponse(400, { error: 'A message is required' })
  }

  const subject =
    cleanText(payload.subject, MAX_SUBJECT_LENGTH) || 'MWM Client Hub - New client message'
  const clientName = cleanText(payload.clientName, 120)
  const clientEmail = cleanText(payload.clientEmail, 254)

  const senderLine =
    clientName || clientEmail
      ? `From: ${clientName || 'Client'}${clientEmail ? ` (${clientEmail})` : ''}`
      : ''
  const body = senderLine ? `${senderLine}\n\n${message}` : message

  const resendResponse = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${resendApiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from,
      to,
      subject,
      text: body,
      ...(isEmail(clientEmail) ? { reply_to: clientEmail } : {}),
    }),
  })

  if (!resendResponse.ok) {
    return jsonResponse(502, { error: 'Email provider rejected the request' })
  }

  return jsonResponse(200, { ok: true })
})
