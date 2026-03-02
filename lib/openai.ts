const OPENAI_API_KEY = process.env.EXPO_PUBLIC_OPENAI_API_KEY;

export interface CatVerificationResult {
  isCat: boolean;
  isFrontFacing: boolean;
  confidence: number;
  isSafe: boolean;
}

export async function verifyCatImage(imageUri: string): Promise<CatVerificationResult> {
  if (!OPENAI_API_KEY) {
    throw new Error('OpenAI API key is not configured');
  }

  // Convert image to base64
  const response = await fetch(imageUri);
  const blob = await response.blob();
  const base64 = await blobToBase64(blob);

  const apiResponse = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${OPENAI_API_KEY}`,
    },
    body: JSON.stringify({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'text',
              text: `Check this photo:
1. Is this a REAL cat (not illustration/cartoon)?
2. Is the cat's face at least partially visible? Be lenient - accept any angle where the face can be generally seen. Only reject if completely facing away or face fully hidden.
3. Is this photo safe for children? Mark isSafe=false if it contains ANY: nudity, sexual content, violence, gore, blood, drugs, weapons, hate symbols, disturbing/shocking imagery, or any content inappropriate for ages 12+.
Reply JSON only: {"isCat": boolean, "isFrontFacing": boolean, "confidence": 0-100, "isSafe": boolean}`,
            },
            {
              type: 'image_url',
              image_url: {
                url: `data:image/jpeg;base64,${base64}`,
              },
            },
          ],
        },
      ],
      max_tokens: 60,
    }),
  });

  if (!apiResponse.ok) {
    const error = await apiResponse.text();
    throw new Error(`OpenAI API error: ${error}`);
  }

  const data = await apiResponse.json();
  const content = data.choices[0]?.message?.content;

  if (!content) {
    throw new Error('No response from OpenAI');
  }

  try {
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('Invalid response format');
    }
    return JSON.parse(jsonMatch[0]);
  } catch {
    return {
      isCat: false,
      isFrontFacing: false,
      confidence: 0,
      isSafe: false,
    };
  }
}

function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const base64String = reader.result as string;
      // Remove data URL prefix (e.g., "data:image/jpeg;base64,")
      const base64 = base64String.split(',')[1];
      resolve(base64);
    };
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}
