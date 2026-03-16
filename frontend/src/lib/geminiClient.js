/**
 * Gemini API 연동 모듈 (직접 fetch 호출 — URL 완전 제어)
 * API Key: VITE_GEMINI_API_KEY 환경 변수에 저장
 */

const GEMINI_API_KEY = import.meta.env.VITE_GEMINI_API_KEY || '';

/**
 * 사용 가능한 모델 엔드포인트 (순서대로 시도)
 */
const ENDPOINTS = [
  'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-lite:generateContent',
  'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent',
  'https://generativelanguage.googleapis.com/v1/models/gemini-1.5-flash:generateContent',
  'https://generativelanguage.googleapis.com/v1beta/models/gemini-pro-vision:generateContent',
];

/**
 * 이미지 파일을 Base64로 변환
 */
function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const base64 = reader.result.split(',')[1];
      resolve(base64);
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

/**
 * 큐미르 읽기전략 시스템 프롬프트
 */
const QMIR_SYSTEM_PROMPT = `
당신은 '큐미르(Qmir) 읽기전략' 전문가입니다.
업로드된 지문 이미지에서 텍스트를 읽고, 다음 형식에 맞춰 분석하세요.

분석 규칙 (엄격히 준수):
- □ 1순위 (네모): 글 전체의 대주제 (단 하나만 선정)
- ○ 2순위 (원): 문단별 핵심어 (최대 4개)
- △ 3순위 (세모): 각 핵심어의 하위 개념/세부 항목 (각 최대 4개)
- → 인과관계: "때문에", "따라서" 등 원인-결과 관계
- ↔ 대조관계: "그러나", "하지만" 등 대조/역접 관계

다음 JSON 형식으로만 응답하세요. JSON 외 다른 텍스트는 절대 포함하지 마세요:
{
  "mainTopic": "1순위 대주제",
  "keywords": [
    {
      "keyword": "○ 핵심어1",
      "subItems": ["△ 세부항목1", "△ 세부항목2"],
      "relation": null
    },
    {
      "keyword": "○ 핵심어2",
      "subItems": ["△ 세부항목1"],
      "relation": "→"
    }
  ],
  "logicRelations": [
    { "type": "인과", "description": "관계 설명" }
  ],
  "summary": "전체 지문의 핵심 내용을 2-3문장으로 요약"
}
`;

/**
 * Gemini API 호출 (직접 fetch — 모델 Fallback 포함)
 */
export async function analyzeImageWithGemini(imageFile) {
  if (!GEMINI_API_KEY) {
    throw new Error(
      'Gemini API 키가 없습니다. .env 파일에 VITE_GEMINI_API_KEY를 추가하세요.'
    );
  }

  const base64Image = await fileToBase64(imageFile);
  const mimeType = imageFile.type || 'image/jpeg';

  const requestBody = {
    contents: [
      {
        parts: [
          { text: QMIR_SYSTEM_PROMPT },
          {
            inline_data: {
              mime_type: mimeType,
              data: base64Image,
            },
          },
        ],
      },
    ],
    generationConfig: {
      temperature: 0.3,
      maxOutputTokens: 2048,
    },
  };

  let lastError = null;

  for (const endpoint of ENDPOINTS) {
    try {
      console.log(`시도 중: ${endpoint}`);

      const response = await fetch(`${endpoint}?key=${GEMINI_API_KEY}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody),
      });

      if (response.status === 404) {
        console.warn(`404: ${endpoint} — 다음 모델 시도...`);
        continue;
      }

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        const errMsg = errorData?.error?.message || response.statusText;
        // 429 등 다른 에러는 다음 모델로 시도
        if (response.status === 429) {
          console.warn(`429 Rate Limit: ${endpoint} — 다음 모델 시도...`);
          lastError = new Error(`Rate Limit (429): ${errMsg}`);
          continue;
        }
        throw new Error(`Gemini API 오류 (${response.status}): ${errMsg}`);
      }

      const data = await response.json();
      const rawText = data?.candidates?.[0]?.content?.parts?.[0]?.text || '';

      // JSON 파싱 (마크다운 코드블록 제거)
      const jsonText = rawText.replace(/```json\n?|\n?```/g, '').trim();
      return JSON.parse(jsonText);

    } catch (err) {
      lastError = err;
      if (err.message?.includes('JSON')) {
        throw err; // JSON 파싱 에러는 모델은 성공했으나 출력 형식 문제
      }
      console.warn(`에러 발생: ${err.message}`);
    }
  }

  throw new Error(
    `모든 Gemini 모델에서 실패했습니다. 마지막 오류: ${lastError?.message || '알 수 없는 오류'}`
  );
}
