import { NextResponse } from "next/server";
import { GoogleGenAI, Type } from "@google/genai";

export const runtime = "edge"; // Edge Functions: Hobby 30초, Pro 300초

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { creationType, originalUrl, topic, target, stats, mode } = body;

    if (!topic || !target || !mode) {
      return NextResponse.json({ error: "강의 주제, 대상, 모드는 필수 입력값입니다." }, { status: 400 });
    }
    
    if (creationType === "rewrite" && (!originalUrl || !originalUrl.trim())) {
      return NextResponse.json({ error: "기존 글 불러와서 작성하기 모드에서는 블로그 링크가 필수입니다." }, { status: 400 });
    }

    let extractedText = "";
    if (creationType === "rewrite") {
      try {
        let fetchUrl = originalUrl.trim();
        try {
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
        } catch (e) {
          // ignore invalid url parse errors
        }

        const htmlRes = await fetch(fetchUrl, {
          headers: { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36" },
          signal: AbortSignal.timeout(8000)
        });
        
        if (!htmlRes.ok) throw new Error("블로그 링크에 접근할 수 없거나 비공개 글입니다.");
        
        const htmlText = await htmlRes.text();
        extractedText = htmlText
          .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
          .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '')
          .replace(/<[^>]+>/g, ' ')
          .replace(/\s+/g, ' ')
          .trim();
          
        if (extractedText.length < 50) {
          throw new Error("블로그 본문을 충분히 읽어오지 못했습니다.");
        }
      } catch (err: any) {
        return NextResponse.json({ error: "링크 텍스트 추출 실패: " + err.message }, { status: 400 });
      }
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: "API 키가 설정되지 않았습니다." }, { status: 500 });
    }

    const ai = new GoogleGenAI({ apiKey });

    const modeFlow = mode === '소개글'
      ? "도입-교육필요성(문제제기)-커리큘럼 상세안내-기대효과-결론-CTA의 흐름"
      : "도입-기획의도-현장분위기-수강생반응-기대효과-결론-CTA의 흐름";

    const forbiddenPhrases = [
      "단순한 지식 전달을 넘어",
      "오늘은~ 알아보겠습니다",
      "단순히"
    ];

    const systemPrompt = `당신은 공공기관 및 교육 기관을 설득하고 교육의 가치를 증명하는 10년 차 '전문 교육 카피라이터'입니다.
'데이터 기반의 신뢰감'과 '현장의 따뜻한 서사'를 적절히 믹스하여 블로그 포스팅 텍스트를 작성하세요.

**[B2G/B2B 전략적 글쓰기 가이드라인: 필수 준수]**
1. **주제 집중도 및 결론**: 모든 포스팅의 결론은 반드시 **'오늘교육원의 맞춤형 교육 솔루션'**으로 연결하여 채널의 전문성을 어필하세요.
2. **대상별 맞춤형 전략**: 모든 주제를 '힐링 연수'로 획일화하지 마세요. 주제(인권, 웰다잉 등)와 대상(공무원, 복지관 등)에 맞게 전문성을 차별화하세요.
   - **싱잉볼/명상/테라피 관련 주제**: [공무원 힐링 연수] 또는 [직무 스트레스 해소] 키워드에 집중하세요.
   - **인권/청렴/직무 관련 주제**: [공공기관 인권 감수성], [법정 의무 교육] 등 행정 담당자가 검색할 법한 키워드에 집중하세요.
   - **복지/노인/웰다잉 관련 주제**: [복지관 프로그램], [찾아가는 시니어 교육] 등 복지 현장 맞춤형 키워드를 사용하세요.
3. **문제 해결형 도입**: 도입부는 단순히 정보를 나열하기보다, "기관 내 소통 부재를 어떻게 해결할 것인가?", "민원 업무로 지친 공직자들의 마음 건강을 어떻게 회복시킬 것인가?", "존엄한 삶의 마무리를 준비하는 어르신들에게 무엇이 필요한가?"와 같이 **주제와 대상에 맞는 실질적 고민과 질문**으로 시작하세요.
4. **전략적 키워드 활용**: 제목 앞부분에 **[대상+주제]** 형태의 대괄호 키워드(예: [공무원 인권 교육], [복지관 웰다잉 프로그램], [기업 커뮤니케이션])를 전략적으로 배치하세요.

**[분량 요구사항: 초극강 주의]**
블로그 본문은 반드시 공백 포함 최소 1500자 이상의 매우 풍성하고 상세한 분량으로 작성해야 합니다. 
단순한 개요가 아니라, 마치 현장에서 직접 취재한 기자처럼 아주 구체적이고 생생한 묘사를 덧붙여 글이 중간에 끊기지 않고 끝까지 길게 이어지도록 하세요. 
문단 하나하나가 긴 호흡으로 상세하게 전개되어야 하며, 전체 글의 총량은 최소 1500자에서 2000자 사이를 지향하세요.

**[🚨 절대 금지어 및 기피 표현 목록 (Blacklist)]**
다음 목록의 단어나 표현은 상투적이거나 AI가 자주 남용하는 표현이므로 어떠한 경우에도 **단 한 번이라도** 사용해서는 안 됩니다.
${forbiddenPhrases.map(phrase => `- "${phrase}"`).join('\n')}
상기 표현을 하나라도 사용할 경우 문서가 반려됩니다. 특히 '단순히'와 같은 특정 부사를 문단마다 습관적으로 시작할 때 남용하는 것을 엄격히 금지합니다.

**[매우 중요: 마크다운 기호 및 이모지 사용 금지]**
네이버 블로그 에디터의 특성에 맞게 줄바꿈(Double Line Breaks)을 풍성하게 사용하세요. ##, **, *, #, -, >, | 같은 마크다운 기호뿐만 아니라, 모든 종류의 이모지(✨, ✅, 📍, 😊 등)는 본문에 절대 사용하지 마세요. 오직 깔끔한 텍스트로만 가독성 있게 구성하며, 사람이 직접 정성껏 쓴 것처럼 차분하고 진중한 문체를 유지하는 것이 핵심입니다.

다음 같은 구조적 요구사항을 반드시 지켜주세요:
1. 3가지 다른 유형의 매력적인 제목을 생성합니다. 특히 **제목 앞부분에 [대상+주제] 형태의 대괄호 키워드를 전략적으로 배치**하세요.
2. 요청된 모드에 맞는 본문 구조:
   ${mode === '소개글' ? 
   "- [소개 모드]: 신뢰와 전문성 지향. 표 기호를 쓰지 말고, 자연스러운 문장과 줄바꿈으로 앞으로 진행될 커리큘럼과 교육의 필요성, 기대효과를 설득력 있게 소개하세요. **주의: 아직 진행되지 않은 강의를 제안하는 기획안 알림 목적의 글이므로, 이미 진행된 현장의 분위기나 수강생의 후기, 반응 등을 절대로 지어내거나 포함하지 마세요.** 마무리엔 유연한 설계 가능성을 강조하세요." : 
   "- [후기 모드]: 감성과 생생함 지향. 강사의 기획 의도 -> 현장 분위기 -> 수강생 피드백 순으로 전개. 이미 진행된 현장 스토리로 구성하며, 수강생 피어백은 따옴표만 사용하여 생생하게 전달하세요."}
3. 고정 CTA 매크로 삽입 및 SEO 해시태그 추가 (특수기호 없이 평문으로 삽입할 것): 
   본문 맨 하단에 아래의 CTA 내용을 그대로 삽입하여 담당자가 쉽게 연락할 수 있도록 안내하세요.
   --
   [강의 섭외 및 행정 지원 안내]
   - Tel. 02-954-5074
   - E-mail: onulacademy@gmail.com

   #상위노출키워드1 #상위노출키워드2 #상위노출키워드3 #상위노출키워드4 #상위노출키워드5 #상위노출키워드6 #상위노출키워드7
   --
4. 보고용 3줄 요약: 내부 담당자가 상사에게 콘텐츠를 보고하거나 SNS에 숏폼으로 올리기 좋은 핵심 3줄 요약 (기호 없이 숫자 1, 2, 3으로만 표기).

**[본문 구성 및 분량 확보 전략]**
본문은 반드시 1,500자 이상의 초장문으로 상세하게 작성해야 합니다. 요청된 모드에 맞춰 반드시 **${modeFlow}**을 따르되, 각 단계마다 최소 300자 이상의 풍부한 설명을 덧붙이세요. **절대로 본문을 중간에 생략하거나 '보고용 3줄 요약'으로 서둘러 넘어가지 마세요.** 본문이 충분히 완성된 것을 확인한 후에만 다음 필드를 작성하세요.
`;

    const rewriteInstruction = creationType === "rewrite" 
      ? `\n\n[제일 중요 - 기존 글 리라이트 지시사항 (유사문서 및 중복문서 판독 회피 목적)]\n사용자가 제공한 원문 블로그 글의 '팩트(행사 정보, 커리큘럼, 참여자 반응 지표)'는 분석하여 온전히 반영해야 합니다. 하지만, 네이버 블로그 검색 엔진의 중복문서 필터링 알고리즘을 완벽하게 회피하기 위해, 어휘(Vocabulary), 문장의 구조, 문단 전환 방식, 글의 서술 리듬을 원문과 180도 완전히 구조적으로 다르게 재창조(Rewrite)해야 합니다. 원문의 문장 덩어리나 표현이 단 한 줄이라도 그대로 노출되면 절대 안 됩니다. 전혀 다른 작성자가 완전히 새로운 시각에서 분석하여 쓴 것처럼 기획안 수준의 완성도로 새롭게 구성하세요.` 
      : "";

    const userMessage = `
[기본 요청 정보]
- 작성 방식: ${creationType === "rewrite" ? "기존 글을 회피 목적의 완전 재작성 (Rewrite)" : "주어진 정보만으로 백지 창작"}
- 강의 주제: ${topic}
- 대상: ${target}
- 주요 수치/성과: ${stats || '별도 수치 정보 없음'}
- 최종 요청 모드: ${mode}
${creationType === "rewrite" ? `\n\n[분석 및 리라이트 대상 원문 텍스트]\n"""\n${extractedText}\n"""\n` : ""}

위 정보를 분석하고 바탕으로 최적화된 블로그 콘텐츠를 구조화하여 생성해주세요. 도입부는 주제와 대상에 맞는 '문제 해결형 도입' 가이드라인을 따르고, 결론은 '오늘교육원의 맞춤형 교육 솔루션'으로 마무리하세요.${rewriteInstruction}
`;

    const generateConfig = {
      contents: [userMessage],
      config: {
        systemInstruction: systemPrompt,
        temperature: 0.5,
        maxOutputTokens: 8192,
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            titles: {
              type: Type.OBJECT,
              properties: {
                typeA: { type: Type.STRING, description: "[대상+주제] 형태의 대괄호 키워드를 포함한 데이터/지표 중심 제목" },
                typeB: { type: Type.STRING, description: "[대상+주제] 형태의 대괄호 키워드를 포함한 현장/서사 중심 제목" },
                typeC: { type: Type.STRING, description: "[대상+주제] 형태의 대괄호 키워드를 포함한 오늘교육원 전문성 강조 제목" }
              },
              required: ["typeA", "typeB", "typeC"]
            },
            bodyParagraphs: {
              type: Type.ARRAY,
              description: "마크다운 기호가 일절 없는 평문 본문 단락의 배열. 본문을 여러 개의 긴 문단으로 세분화하세요. 1500자 이상을 채우기 위해 최소 6~7개 이상의 단락을 배열에 넣어야 합니다. 배열의 마지막 원소에는 반드시 CTA와 해시태그를 포함하세요.",
              items: { type: Type.STRING }
            },
            summary: { type: Type.STRING, description: "내부 보고/SNS 홍보용 핵심 3줄 요약 (평문)" }
          },
          required: ["titles", "bodyParagraphs", "summary"]
        }
      }
    };

    const models = ["gemini-2.5-flash", "gemini-2.0-flash"];
    let response: Awaited<ReturnType<typeof ai.models.generateContent>> | null = null;
    let lastError: any = null;

    for (const model of models) {
      try {
        response = await ai.models.generateContent({ model, ...generateConfig });
        break;
      } catch (err: any) {
        lastError = err;
        const is503 = err?.status === 503 || err?.message?.includes("503") || err?.message?.includes("UNAVAILABLE");
        if (!is503) throw err;
      }
    }

    if (!response) throw lastError;
    
    const parsedContent = response.text;
    if (!parsedContent) throw new Error("AI 응답 본문을 읽어올 수 없습니다.");
    
    const parsedData = JSON.parse(parsedContent);

    // 배열로 받은 문단들을 줄바꿈 2번으로 결합
    if (parsedData.bodyParagraphs && Array.isArray(parsedData.bodyParagraphs)) {
      parsedData.body = parsedData.bodyParagraphs.join("\n\n");
      delete parsedData.bodyParagraphs;
    }

    // 금지어 자동 치환/제거
    if (parsedData.body) {
      let bodyText = parsedData.body;
      bodyText = bodyText.split("단순한 지식 전달을 넘어").join("실질적인 교육적 효과를 창출하며");
      const otherForbidden = forbiddenPhrases.filter(p => p !== "단순한 지식 전달을 넘어");
      otherForbidden.forEach(phrase => {
        bodyText = bodyText.split(phrase).join("");
      });
      parsedData.body = bodyText;
    }

    return NextResponse.json(parsedData);

  } catch (error: any) {
    console.error("Generation API Error:", error);
    const status = error.status || 500;
    return NextResponse.json({ 
      error: error.message || "내부 서버 오류가 발생했습니다."
    }, { status: status });
  }
}
