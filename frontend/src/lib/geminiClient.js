/**
 * Gemini API 연동 모듈 (공식 SDK 사용)
 * API Key: VITE_GEMINI_API_KEY 환경 변수에 저장
 */

import { GoogleGenerativeAI } from '@google/generative-ai';

const apiKey = import.meta.env.VITE_GEMINI_API_KEY || '';

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
 * 사용 가능한 모델 목록 (순서대로 시도)
 */
const MODEL_CONFIGS = [
  { model: 'gemini-2.0-flash', apiVersion: 'v1beta' },
  { model: 'gemini-1.5-flash', apiVersion: 'v1' },
  { model: 'gemini-pro-vision', apiVersion: 'v1beta' },
];

/**
 * Gemini 공식 SDK로 이미지 분석 호출 (Fallback 포함)
 */
export async function analyzeImageWithGemini(imageFile) {
  if (!apiKey) {
    throw new Error(
      'Gemini API 키가 없습니다. .env 파일에 VITE_GEMINI_API_KEY를 추가하세요.'
    );
  }

  const genAI = new GoogleGenerativeAI(apiKey);

  const base64Image = await fileToBase64(imageFile);
  const mimeType = imageFile.type || 'image/jpeg';

  const imagePart = {
    inlineData: {
      data: base64Image,
      mimeType: mimeType,
    },
  };

  let lastError = null;

  for (const config of MODEL_CONFIGS) {
    try {
      const model = genAI.getGenerativeModel(
        { model: config.model },
        { apiVersion: config.apiVersion }
      );

      const result = await model.generateContent([QMIR_SYSTEM_PROMPT, imagePart]);
      const response = await result.response;
      const rawText = response.text();

      // JSON 파싱 (마크다운 코드블록 제거)
      const jsonText = rawText.replace(/```json\n?|\n?```/g, '').trim();
      return JSON.parse(jsonText);

    } catch (err) {
      lastError = err;
      // 404 또는 모델 미지원 에러면 다음 모델로 시도
      if (err.message?.includes('404') || err.message?.includes('not found') || err.message?.includes('not supported')) {
        console.warn(`모델 ${config.model} (${config.apiVersion}) 사용 불가, 다음 모델 시도...`);
        continue;
      }
      // 다른 에러 (429 등)는 그대로 throw
      throw err;
    }
  }

  throw new Error(
    `사용 가능한 Gemini 모델을 찾지 못했습니다. 마지막 오류: ${lastError?.message || '알 수 없는 오류'}`
  );
}
