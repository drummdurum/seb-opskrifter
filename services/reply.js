const OpenAI = require('openai');

async function suggestReply(input) {
  if (!process.env.OPENAI_API_KEY) {
    throw new Error('OPENAI_API_KEY er ikke sat — kan ikke generere svar.');
  }

  const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  const response = await client.responses.create({
    model: process.env.OPENAI_MODEL || 'gpt-4.1-mini',
    input: [
      {
        role: 'system',
        content:
          'Du hjælper med at besvare emails på dansk. Skriv et kort, høfligt og konkret svar. ' +
          'Returnér KUN selve svarteksten — ingen emnelinje, ingen pladsholdere som [dit navn]. ' +
          'Hvis mailen stiller et spørgsmål, så adressér det direkte.',
      },
      {
        role: 'user',
        content: JSON.stringify({
          fra: input.senderName,
          emne: input.subject,
          indhold: (input.body || '').slice(0, 4000),
        }),
      },
    ],
  });

  return response.output_text.trim();
}

module.exports = { suggestReply };
