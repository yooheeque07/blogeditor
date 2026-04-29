import { NextResponse } from "next/server";
import { GoogleGenAI, Type } from "@google/genai";

export const maxDuration = 60; // Vercel 최대 타임아웃 60초로 연장

export async function POST(req: Request) {
  const encoder = new TextEncoder();

  // 즉시 스트림을 반환하여 Vercel의 10-15초 타임아웃(TTFB)을 회피합니다.
  const stream = new ReadableStream({
    async start(controller) {
      try {
        controller.enqueue(encoder.encode("[PROGRESS] 요청 분석 중...\n"));

        const body = await req.json();
        const { creationType, originalUrl, topic, target, stats, mode } = body;

        if (!topic || !target || !mode) {
          controller.enqueue(encoder.encode("[ERROR] 필수 입력값이 누락되었습니다."));
          controller.close();
          return;
        }

        let extractedText = "";
        if (creationType === "rewrite") {
          controller.enqueue(encoder.encode("[PROGRESS] 블로그 본문 읽어오는 중...\n"));
          try {
            let fetchUrl = originalUrl.trim();
            const urlObj = new URL(fetchUrl);
            if (urlObj.hostname === "blog.naver.com") {
              const pathParts = urlObj.pathname.split('/').filter(Boolean);
              if (pathParts.length === 2 && !urlObj.pathname.includes('PostView')) {
                fetchUrl = `https://m.blog.naver.com/${pathParts[0]}/${pathParts[1]}`;
              } else if (urlObj.pathname.includes('PostView.nhn') || urlObj.pathname.includes('PostView.naver')) {
                const blogId = urlObj.searchParams.get('blogId');
                const logNo = urlObj.searchParams.get('logNo');
                if (blogId && logNo) fetchUrl = `https://m.blog.naver.com/${blogId}/${logNo}`;
              }
            }
            
            const htmlRes = await fetch(fetchUrl, {
              headers: { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36" },
              signal: AbortSignal.timeout(8000) // 8초 타임아웃
            });
            
            if (!htmlRes.ok) throw new Error("블로그 링크 접근 실패");
            const htmlText = await htmlRes.text();
            extractedText = htmlText
              .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
              .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '')
              .replace(/<[^>]+>/g, ' ')
              .replace(/\s+/g, ' ')
              .trim();
              
            if (extractedText.length < 50) throw new Error("본문 추출 실패");
          } catch (err: any) {
            controller.enqueue(encoder.encode(`[ERROR] 링크 분석 실패: ${err.message}`));
            controller.close();
            return;
          }
        }

        const apiKey = process.env.GEMINI_API_KEY;
        if (!apiKey) {
          controller.enqueue(encoder.encode("[ERROR] API 키가 설정되지 않았습니다."));
          controller.close();
          return;
        }

        controller.enqueue(encoder.encode("[PROGRESS] AI 카피라이터 연결 중...\n"));
        const ai = new GoogleGenAI({ apiKey });

        const modeFlow = mode === '소개글'
          ? "도입-교육필요성(문제제기)-커리큘럼 상세안내-기대효과-결론-CTA의 흐름"
          : "도입-기획의도-현장분위기-수강생반응-기대효과-결론-CTA의 흐름";

        const systemPrompt = `당신은 공공기관 및 교육 기관을 설득하고 교육의 가치를 증명하는 10년 차 '전문 교육 카피라이터'입니다.
'데이터 기반의 신뢰감'과 '현장의 따뜻한 서사'를 적절히 믹스하여 블로그 포스팅 텍스트를 작성하세요. 1,500자 이상의 초장문으로 작성해야 합니다.`;

        const streamingPrompt = `${systemPrompt}
**[출력 형식]** 반드시 아래 태그 구조만 사용하세요.
[TITLES]
Type A: ...
Type B: ...
Type C: ...
[BODY]
...
[SUMMARY]
...`;

        const userMessage = `주제: ${topic}, 대상: ${target}, 모드: ${mode}, 리라이트대상: ${extractedText.substring(0, 5000)}`;

        // 속도가 빠른 Flash 모델을 우선 배치하여 504 에러를 방지합니다.
        const modelPriority = ["gemini-2.5-flash", "gemini-3-flash-preview", "gemini-3.1-pro-preview", "gemini-2.5-pro"];
        
        let success = false;
        for (const modelName of modelPriority) {
          try {
            const result = await ai.models.streamGenerateContent({
              model: modelName,
              contents: [userMessage],
              config: { systemInstruction: streamingPrompt, temperature: 0.7, maxOutputTokens: 8192 }
            });

            controller.enqueue(encoder.encode("[PROGRESS] 블로그 글 작성 시작...\n"));
            for await (const chunk of result.stream) {
              if (chunk.text) controller.enqueue(encoder.encode(chunk.text));
            }
            success = true;
            break;
          } catch (e: any) {
            console.warn(`Model ${modelName} failed:`, e.message);
            continue;
          }
        }

        if (!success) controller.enqueue(encoder.encode("[ERROR] 모든 AI 모델이 응답에 실패했습니다."));

      } catch (error: any) {
        console.error("Stream Start Error:", error);
        controller.enqueue(encoder.encode(`[ERROR] 서버 오류: ${error.message}`));
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      "Connection": "keep-alive",
    },
  });
}
