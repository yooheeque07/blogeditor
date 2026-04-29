"use client";

import { useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

interface OutputData {
  titles: { typeA: string; typeB: string; typeC: string };
  body: string;
  summary: string;
}

export default function Home() {
  const [creationType, setCreationType] = useState("new");
  const [originalUrl, setOriginalUrl] = useState("");
  
  const [topic, setTopic] = useState("");
  const [target, setTarget] = useState("");
  const [stats, setStats] = useState("");
  const [mode, setMode] = useState("소개글");

  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<OutputData | null>(null);
  const [errorText, setErrorText] = useState("");

  const handleGenerate = async () => {
    if (!topic || !target) {
      alert("강의 주제와 교육 대상을 입력해주세요.");
      return;
    }
    
    if (creationType === "rewrite" && !originalUrl.trim()) {
      alert("기존 블로그글 불러와서 작성하기 모드에서는 블로그 링크를 반드시 입력해야합니다.");
      return;
    }
    
    setIsLoading(true);
    setErrorText("");
    
    try {
      const res = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ creationType, originalUrl, topic, target, stats, mode }),
      });
      
      const text = await res.text();
      let data;
      try {
        data = JSON.parse(text);
      } catch (e) {
        if (!res.ok) {
           throw new Error(res.status === 504 ? "생성 시간이 초과되었습니다. (Vercel 타임아웃 60초 초과)" : "서버에서 올바르지 않은 응답이 반환되었습니다. (500 Error)");
        }
        throw new Error("JSON 파싱 오류: 서버 응답이 올바르지 않습니다.");
      }
      
      if (!res.ok) {
        throw new Error(data?.error || "생성 중 오류가 발생했습니다.");
      }
      
      setResult(data);
    } catch (error: any) {
      setErrorText(error.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCopy = (text: string, e: React.MouseEvent<HTMLButtonElement>) => {
    navigator.clipboard.writeText(text);
    const btn = e.currentTarget;
    const oldText = btn.innerText;
    btn.innerText = "복사 완료!";
    btn.style.background = "#22c55e"; // Green
    btn.style.color = "white";
    btn.style.borderColor = "transparent";
    
    setTimeout(() => {
      btn.innerText = oldText;
      btn.style.background = "";
      btn.style.color = "";
      btn.style.borderColor = "";
    }, 2000);
  };

  return (
    <div className="container">
      <header className="header animate-fade-in">
        <h1 className="header-title">오늘교육원 블로그 콘텐츠 생성기 ✨</h1>
        <p className="header-subtitle">데이터 기반의 신뢰감과 따뜻한 현장 서사를 담은 포스팅을 자동으로 생성합니다.</p>
      </header>
      
      <main className="split-view animate-fade-in" style={{ animationDelay: '0.1s' }}>
        {/* Left Panel: Input Form */}
        <section className="panel panel-left">
          <div className="form-group">
            <label className="form-label">작성 방식 선택 <span style={{color:'red'}}>*</span></label>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem', marginTop: '0.2rem', padding: '1rem', border: '1px solid var(--color-border)', borderRadius: '8px', background: 'white' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', fontWeight: creationType === "new" ? 600 : 400 }}>
                <input 
                  type="radio" 
                  name="creationType" 
                  value="new" 
                  checked={creationType === "new"} 
                  onChange={() => setCreationType("new")} 
                />
                ✨ 새 글 작성하기 (처음부터 알아서 작성)
              </label>
              <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', fontWeight: creationType === "rewrite" ? 600 : 400 }}>
                <input 
                  type="radio" 
                  name="creationType" 
                  value="rewrite" 
                  checked={creationType === "rewrite"} 
                  onChange={() => setCreationType("rewrite")} 
                />
                📝 기존 블로그글 기반 작성 (유사문서 판독 완벽 회피)
              </label>
            </div>
            
            {creationType === "rewrite" && (
              <div className="animate-fade-in" style={{ marginTop: '0.5rem' }}>
                <input 
                  type="text"
                  className="form-input" 
                  style={{ fontSize: '0.9rem', borderColor: 'var(--color-secondary-blue)', boxShadow: '0 0 0 1px rgba(37,99,235,0.1)' }}
                  placeholder="예: https://blog.naver.com/id/12345678"
                  value={originalUrl}
                  onChange={(e) => setOriginalUrl(e.target.value)}
                />
                <p style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', marginTop: '0.4rem', lineHeight: 1.4 }}>
                  기존 블로그 글 링크를 입력하시면 시스템이 글을 읽고 유사문서를 피하여 새로운 글로 리라이팅합니다.<br/>
                  (네이버 블로그 링크 호환)
                </p>
              </div>
            )}
          </div>

          <div className="form-group" style={{ marginTop: '0.5rem' }}>
            <label className="form-label">강의 주제 <span style={{color:'red'}}>*</span></label>
            <input 
              type="text" 
              className="form-input" 
              placeholder="예: [공무원 힐링 연수] 싱잉볼 명상 테라피, 번아웃 예방 교육 등" 
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
            />
          </div>
          
          <div className="form-group">
            <label className="form-label">교육 대상 <span style={{color:'red'}}>*</span></label>
            <input 
              type="text" 
              className="form-input" 
              placeholder="예: 지자체 신입 공무원 50명, 민원 담당 공직자, 기업 임직원 등" 
              value={target}
              onChange={(e) => setTarget(e.target.value)}
            />
          </div>

          <div className="form-group">
            <label className="form-label">주요 수치 및 특징 (선택)</label>
            <textarea 
              className="form-textarea" 
              placeholder="예: 만족도 98%, S2B 등록 완료, 나라장터 수의계약 가능, 행정 서류 일체 지원 등"
              value={stats}
              onChange={(e) => setStats(e.target.value)}
            />
          </div>

          <div className="form-group">
            <label className="form-label">최종 요청 모드</label>
            <select className="form-select" value={mode} onChange={(e) => setMode(e.target.value)}>
              <option value="소개글">1️⃣ 소개글 (신뢰와 전문성, B2B 제안 중심)</option>
              <option value="후기글">2️⃣ 후기글 (현장의 생생함, 수강생 피드백 중심)</option>
            </select>
            <span style={{fontSize: '0.85rem', color: 'var(--color-text-muted)', marginTop: '0.2rem'}}>모드에 따라 어투와 구성(표/인용구)이 완전히 다르게 생성됩니다.</span>
          </div>

          <button className="btn-primary" onClick={handleGenerate} disabled={isLoading}>
            {isLoading ? <div className="loader" style={{ borderColor: 'rgba(255,255,255,0.3)', borderTopColor: 'white' }} /> : "✨ AI 콘텐츠 자동 생성하기"}
          </button>
          
          {errorText && (
            <div style={{ color: '#ef4444', marginTop: '1rem', fontSize: '0.9rem', padding: '1rem', background: '#fef2f2', borderRadius: '8px', border: '1px solid #fecaca' }}>
              <strong>오류 발생:</strong> {errorText}
            </div>
          )}
        </section>
        
        {/* Right Panel: Output Generation */}
        <section className="panel panel-right">
          <div className="result-section">
            <div className="result-heading">
              <span>추천 타이틀 전략 3종</span>
              <button 
                className="btn-secondary"
                onClick={(e) => result && handleCopy(`${result.titles.typeA}\n${result.titles.typeB}\n${result.titles.typeC}`, e)}
                disabled={!result}
                style={{ opacity: result ? 1 : 0.5 }}
              >
                전체 복사
              </button>
            </div>
            
            {!result && !isLoading && (
              <div style={{ color: '#94a3b8', fontStyle: 'italic', padding: '1rem 0' }}>결과 대기 중...</div>
            )}
            
            {isLoading && (
              <div style={{ padding: '1rem 0', display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div className="loader border-[#cbd5e1] border-top-[#3b82f6]"></div>
                <span style={{ color: '#64748b' }}>{creationType === 'rewrite' ? '기존 블로그 글을 회피/재구성 분석 중입니다...' : '타이틀 전략을 기획하고 있습니다...'}</span>
              </div>
            )}
            
            {result && (
              <div className="animate-fade-in" style={{ animationDelay: '0.1s' }}>
                <div className="title-card">
                  <div>
                    <span style={{ fontSize: '0.8rem', color: 'var(--color-secondary-blue)', fontWeight: 600 }}>[데이터/성과형]</span>
                    <p style={{ marginTop: '0.3rem', fontWeight: 500, fontSize: '1.05rem', color: 'var(--color-primary-navy)' }}>{result.titles.typeA}</p>
                  </div>
                  <button className="btn-secondary" style={{ padding: '0.3rem 0.6rem' }} onClick={(e) => handleCopy(result.titles.typeA, e)}>복사</button>
                </div>
                <div className="title-card">
                  <div>
                    <span style={{ fontSize: '0.8rem', color: '#10b981', fontWeight: 600 }}>[서사/현장형]</span>
                    <p style={{ marginTop: '0.3rem', fontWeight: 500, fontSize: '1.05rem', color: 'var(--color-primary-navy)' }}>{result.titles.typeB}</p>
                  </div>
                  <button className="btn-secondary" style={{ padding: '0.3rem 0.6rem' }} onClick={(e) => handleCopy(result.titles.typeB, e)}>복사</button>
                </div>
                <div className="title-card">
                  <div>
                    <span style={{ fontSize: '0.8rem', color: '#8b5cf6', fontWeight: 600 }}>[전문성 브랜드형]</span>
                    <p style={{ marginTop: '0.3rem', fontWeight: 500, fontSize: '1.05rem', color: 'var(--color-primary-navy)' }}>{result.titles.typeC}</p>
                  </div>
                  <button className="btn-secondary" style={{ padding: '0.3rem 0.6rem' }} onClick={(e) => handleCopy(result.titles.typeC, e)}>복사</button>
                </div>
              </div>
            )}
          </div>

          <div className="result-section">
            <div className="result-heading">
              <span>블로그 본문 미리보기 {result && <span style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', fontWeight: 400, marginLeft: '8px' }}>(약 {result.body.length.toLocaleString()}자)</span>}</span>
              <button 
                className="btn-secondary"
                onClick={(e) => result && handleCopy(result.body, e)}
                disabled={!result}
                style={{ opacity: result ? 1 : 0.5 }}
              >
                본문 파트 복사하기
              </button>
            </div>
            <div className="markdown-body" style={{ minHeight: '150px' }}>
              {!result && !isLoading && (
                <blockquote><p>좌측에서 정보를 모두 입력하고 <strong>"콘텐츠 자동 생성하기"</strong> 버튼을 눌러주세요.</p></blockquote>
              )}
              {isLoading && (
                <div className="animate-fade-in" style={{ padding: '2.5rem 0', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '15px' }}>
                  <div className="loader" style={{ border: '4px solid #e2e8f0', borderTop: '4px solid #2563eb', width: '36px', height: '36px' }}></div>
                  <span style={{ color: '#475569', fontWeight: 500 }}>AI 카피라이터가 상황에 맞는 블로그 본문을 평문으로 작성하고 있습니다... (약 10~15초 소요)</span>
                </div>
              )}
              {result && (
                <div className="animate-fade-in" style={{ animationDelay: '0.2s', padding: '1rem', background: 'rgba(255,255,255,0.5)', borderRadius: '12px', whiteSpace: 'pre-wrap', fontFamily: 'inherit', color: '#1E293B', lineHeight: 1.7 }}>
                  {result.body}
                </div>
              )}
            </div>
          </div>
          
          <div className="result-section" style={{ marginBottom: 0 }}>
            <div className="result-heading">
              <span>보고용 3줄 요약 (내부 숏폼 홍보용)</span>
              <button 
                className="btn-secondary"
                onClick={(e) => result && handleCopy(result.summary, e)}
                disabled={!result}
                style={{ opacity: result ? 1 : 0.5 }}
              >
                복사
              </button>
            </div>
            <div style={{ color: '#334155', lineHeight: 1.6, fontWeight: 500 }}>
              {!result && !isLoading && <span style={{ color: '#94a3b8', fontStyle: 'italic' }}>결과 대기 중...</span>}
              {isLoading && <span style={{ color: '#94a3b8' }}>요약문 생성 중...</span>}
              {result && <div className="animate-fade-in" style={{ whiteSpace: 'pre-line', animationDelay: '0.3s' }}>{result.summary}</div>}
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
