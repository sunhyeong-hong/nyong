// Cat Matching Service - Hybrid Approach
// 1차: CLIP 임베딩 비교 (빠르고 저렴)
// 2차: GPT-4o 특징 비교 (애매한 경우만)

import { NyongFeatures } from '../types';

const OPENAI_API_KEY = process.env.EXPO_PUBLIC_OPENAI_API_KEY;

// 임베딩 유사도 임계값 (가드레일 수준: 완전히 다른 고양이만 차단)
const HIGH_SIMILARITY_THRESHOLD = 0.55;  // 같은 고양이로 판정
const LOW_SIMILARITY_THRESHOLD = 0.20;   // 확실히 다른 고양이 (매우 낮은 기준)
// 0.20 ~ 0.55: GPT-4o로 털색/품종 수준 확인

export interface MatchResult {
  isMatch: boolean;
  confidence: number;
  matchedNyongId?: number;
  method: 'embedding' | 'features' | 'hybrid';
}

/**
 * 텍스트 → 임베딩 생성 (embedding API만 호출)
 * 등록 시: extractCatFeatures 결과를 그대로 임베딩으로 변환 (GPT 호출 절약)
 */
export async function generateEmbeddingFromText(text: string): Promise<number[]> {
  if (__DEV__) {
    console.log('[CatMatcher] DEV mode - returning dummy embedding');
    return Array(1536).fill(0).map(() => Math.random());
  }

  const embResponse = await fetch('https://api.openai.com/v1/embeddings', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${OPENAI_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'text-embedding-3-small',
      input: text,
    }),
  });

  const embData = await embResponse.json();
  if (!embData.data?.[0]?.embedding) {
    throw new Error('Failed to generate embedding');
  }

  return embData.data[0].embedding;
}

/**
 * 이미지 → 임베딩 생성 (gpt-4o-mini로 설명 + embedding)
 * 업로드 매칭 시 사용
 */
export async function generateEmbedding(imageUrl: string): Promise<number[]> {
  if (__DEV__) {
    console.log('[CatMatcher] DEV mode - returning dummy embedding');
    return Array(1536).fill(0).map(() => Math.random());
  }

  const descResponse = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${OPENAI_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'gpt-4o-mini',
      messages: [{
        role: 'user',
        content: [
          {
            type: 'text',
            text: 'Describe this cat briefly for identification: fur color, pattern, eye color, markings, body type. Output only the description.',
          },
          {
            type: 'image_url',
            image_url: { url: imageUrl },
          },
        ],
      }],
      max_tokens: 200,
    }),
  });

  const descData = await descResponse.json();
  if (!descData.choices?.[0]?.message?.content) {
    throw new Error('Failed to describe cat image');
  }

  return generateEmbeddingFromText(descData.choices[0].message.content);
}

/**
 * 코사인 유사도 계산
 */
export function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length) return 0;

  let dot = 0;
  let normA = 0;
  let normB = 0;

  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }

  return dot / (Math.sqrt(normA) * Math.sqrt(normB));
}

/**
 * GPT-4o로 고양이 특징 추출
 * 뇽 등록 시 한 번만 호출
 */
export async function extractCatFeatures(imageBase64: string): Promise<NyongFeatures> {
  if (__DEV__) {
    console.log('[CatMatcher] DEV mode - returning dummy features');
    return {
      fur_color: 'orange tabby',
      fur_pattern: 'striped with white patches',
      eye_color: 'green',
      ear_shape: 'pointed',
      distinctive_marks: 'M shape on forehead',
      body_type: 'medium',
    };
  }

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${OPENAI_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'gpt-4o',
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'text',
              text: `Analyze this cat photo and extract identifying features.
Return ONLY a JSON object with these exact fields:
{
  "fur_color": "main color description",
  "fur_pattern": "pattern type (striped/solid/calico/tuxedo/etc)",
  "eye_color": "eye color",
  "ear_shape": "ear shape description",
  "distinctive_marks": "any unique markings, scars, or features",
  "body_type": "body type (slim/medium/chubby)"
}
Be specific and detailed for identification purposes.`
            },
            {
              type: 'image_url',
              image_url: { url: `data:image/jpeg;base64,${imageBase64}` }
            }
          ]
        }
      ],
      max_tokens: 300,
    })
  });

  const data = await response.json();
  const content = data.choices[0].message.content;

  // JSON 파싱
  const jsonMatch = content.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    throw new Error('Failed to parse cat features');
  }

  return JSON.parse(jsonMatch[0]);
}

/**
 * GPT-4o로 두 고양이 특징 비교
 * 임베딩 유사도가 애매할 때만 호출
 */
export async function compareFeatures(
  registeredFeatures: NyongFeatures,
  uploadedImageBase64: string
): Promise<{ isSame: boolean; confidence: number }> {
  if (__DEV__) {
    console.log('[CatMatcher] DEV mode - assuming same cat');
    return { isSame: true, confidence: 85 };
  }

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${OPENAI_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'gpt-4o',
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'text',
              text: `Compare this cat photo with the registered cat's features. Be VERY lenient.

Registered cat:
- Fur color: ${registeredFeatures.fur_color}
- Fur pattern: ${registeredFeatures.fur_pattern}
- Body type: ${registeredFeatures.body_type}

ONLY check: Is the fur color and breed/type roughly similar?
- Ignore pose, angle, lighting differences
- Back views, side views, sleeping poses are ALL fine
- Only reject if it's clearly a DIFFERENT type of cat (e.g., black cat vs orange tabby, long-hair vs short-hair)

Return ONLY: {"is_same": true/false, "confidence": 0-100, "reason": "brief explanation"}`
            },
            {
              type: 'image_url',
              image_url: { url: `data:image/jpeg;base64,${uploadedImageBase64}` }
            }
          ]
        }
      ],
      max_tokens: 200,
    })
  });

  const data = await response.json();
  const content = data.choices[0].message.content;

  const jsonMatch = content.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    return { isSame: false, confidence: 0 };
  }

  const result = JSON.parse(jsonMatch[0]);
  return {
    isSame: result.is_same,
    confidence: result.confidence,
  };
}

/**
 * 하이브리드 매칭: 업로드 사진이 등록된 뇽과 일치하는지 확인
 *
 * @param uploadedEmbedding - 업로드된 사진의 CLIP 임베딩
 * @param uploadedImageBase64 - 업로드된 사진 (base64)
 * @param registeredNyongs - 사용자의 등록된 뇽 목록
 */
export async function matchCat(
  uploadedEmbedding: number[],
  uploadedImageBase64: string,
  registeredNyongs: Array<{
    id: number;
    features: NyongFeatures;
    front_embedding: number[];
    embeddings: number[][];
  }>
): Promise<MatchResult> {
  let bestMatch: { nyongId: number; similarity: number } | null = null;

  // 1차: 모든 등록된 뇽의 임베딩과 비교
  for (const nyong of registeredNyongs) {
    // 정면 사진과 비교
    const frontSim = cosineSimilarity(uploadedEmbedding, nyong.front_embedding);
    if (!bestMatch || frontSim > bestMatch.similarity) {
      bestMatch = { nyongId: nyong.id, similarity: frontSim };
    }

    // 추가 사진들과도 비교
    for (const emb of nyong.embeddings || []) {
      const sim = cosineSimilarity(uploadedEmbedding, emb);
      if (sim > bestMatch.similarity) {
        bestMatch = { nyongId: nyong.id, similarity: sim };
      }
    }
  }

  if (!bestMatch) {
    return { isMatch: false, confidence: 0, method: 'embedding' };
  }

  // 높은 유사도: 바로 매칭
  if (bestMatch.similarity >= HIGH_SIMILARITY_THRESHOLD) {
    return {
      isMatch: true,
      confidence: bestMatch.similarity * 100,
      matchedNyongId: bestMatch.nyongId,
      method: 'embedding',
    };
  }

  // 낮은 유사도: 매칭 실패
  if (bestMatch.similarity < LOW_SIMILARITY_THRESHOLD) {
    return {
      isMatch: false,
      confidence: bestMatch.similarity * 100,
      method: 'embedding',
    };
  }

  // 2차: 애매한 경우 GPT-4o로 특징 비교
  const matchedNyong = registeredNyongs.find(n => n.id === bestMatch!.nyongId);
  if (!matchedNyong) {
    return { isMatch: false, confidence: 0, method: 'embedding' };
  }

  const featureResult = await compareFeatures(matchedNyong.features, uploadedImageBase64);

  return {
    isMatch: featureResult.isSame,
    confidence: featureResult.confidence,
    matchedNyongId: featureResult.isSame ? bestMatch.nyongId : undefined,
    method: 'hybrid',
  };
}
