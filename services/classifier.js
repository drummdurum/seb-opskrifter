const OpenAI = require('openai');

function localClassification(subject, body, sender) {
  const content = `${subject}\n${body}`.toLowerCase();
  const receiptSignals = [
    'kvittering', 'receipt', 'ordrebekræftelse', 'order confirmation', 'faktura',
    'invoice', 'moms', 'total', 'betaling',
  ];
  const newsletterSignals = [
    'unsubscribe', 'afmeld', 'nyhedsbrev', 'newsletter', 'ugens', 'tilbud',
    'view in browser', 'læs i browser',
  ];
  const receiptScore = receiptSignals.filter((signal) => content.includes(signal)).length;
  const newsletterScore = newsletterSignals.filter((signal) => content.includes(signal)).length;
  const amountMatch = content.match(/(?:dkk|kr\.?)\s?(\d+(?:[.,]\d{2})?)|(\d+(?:[.,]\d{2})?)\s?(?:dkk|kr\.?)/i);

  if (receiptScore >= 2) {
    return {
      category: 'receipt',
      confidence: Math.min(0.92, 0.65 + receiptScore * 0.07),
      summary: `Sandsynlig kvittering eller ordre fra ${sender}.`,
      amount: amountMatch ? Number((amountMatch[1] || amountMatch[2]).replace(',', '.')) : null,
      currency: amountMatch ? 'DKK' : null,
      merchant: sender,
    };
  }
  if (newsletterScore >= 1) {
    return {
      category: 'newsletter',
      confidence: Math.min(0.94, 0.72 + newsletterScore * 0.06),
      summary: `Nyhedsbrev eller kampagnemail fra ${sender}.`,
      amount: null,
      currency: null,
      merchant: null,
    };
  }
  return {
    category: 'other',
    confidence: 0.62,
    summary: subject ? `Mail om "${subject.slice(0, 100)}".` : `Almindelig mail fra ${sender}.`,
    amount: null,
    currency: null,
    merchant: null,
  };
}

async function classifyEmail(input) {
  if (!process.env.OPENAI_API_KEY) {
    return localClassification(input.subject, input.body, input.senderName);
  }

  const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  try {
    const response = await client.responses.create({
      model: process.env.OPENAI_MODEL || 'gpt-4.1-mini',
      input: [
        {
          role: 'system',
          content:
            'Klassificér mailen som newsletter, receipt eller other. Skriv et neutralt dansk resumé. Returnér kun JSON.',
        },
        {
          role: 'user',
          content: JSON.stringify({
            from: `${input.senderName} <${input.senderEmail}>`,
            subject: input.subject,
            body: input.body.slice(0, 5000),
          }),
        },
      ],
      text: {
        format: {
          type: 'json_schema',
          name: 'mail_classification',
          strict: true,
          schema: {
            type: 'object',
            additionalProperties: false,
            properties: {
              category: { type: 'string', enum: ['newsletter', 'receipt', 'other'] },
              confidence: { type: 'number', minimum: 0, maximum: 1 },
              summary: { type: 'string' },
              amount: { type: ['number', 'null'] },
              currency: { type: ['string', 'null'] },
              merchant: { type: ['string', 'null'] },
            },
            required: ['category', 'confidence', 'summary', 'amount', 'currency', 'merchant'],
          },
        },
      },
    });
    const parsed = JSON.parse(response.output_text);
    // Strict schema håndhæver formen; vi normaliserer blot lidt for en sikkerheds skyld.
    return {
      category: ['newsletter', 'receipt', 'other'].includes(parsed.category) ? parsed.category : 'other',
      confidence: Math.max(0, Math.min(1, Number(parsed.confidence) || 0)),
      summary: String(parsed.summary || '').slice(0, 180),
      amount: parsed.amount === null ? null : Number(parsed.amount),
      currency: parsed.currency === null ? null : String(parsed.currency).slice(0, 3),
      merchant: parsed.merchant === null ? null : String(parsed.merchant).slice(0, 100),
    };
  } catch (error) {
    console.error('AI classification failed; using local fallback.', error);
    return localClassification(input.subject, input.body, input.senderName);
  }
}

module.exports = { classifyEmail };
