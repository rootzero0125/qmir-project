import { useState, useRef } from 'react';
import { analyzeImageWithGemini } from './lib/geminiClient';
import './App.css';

function App() {
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const fileInputRef = useRef(null);

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      const selectedFile = e.target.files[0];
      setFile(selectedFile);
      setResult(null);
      setError(null);
      setPreview(URL.createObjectURL(selectedFile));
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    const droppedFile = e.dataTransfer.files[0];
    if (droppedFile && droppedFile.type.startsWith('image/')) {
      setFile(droppedFile);
      setResult(null);
      setError(null);
      setPreview(URL.createObjectURL(droppedFile));
    }
  };

  const handleDragOver = (e) => e.preventDefault();

  const handleAnalyze = async () => {
    if (!file) {
      fileInputRef.current?.click();
      return;
    }

    setIsAnalyzing(true);
    setResult(null);
    setError(null);

    try {
      const analysisResult = await analyzeImageWithGemini(file);
      setResult(analysisResult);
    } catch (err) {
      setError(err.message || '분석 중 오류가 발생했습니다.');
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleReset = () => {
    setFile(null);
    setPreview(null);
    setResult(null);
    setError(null);
  };

  return (
    <div className="app-container">
      <div className={`glass-panel ${result ? 'wide' : ''}`}>
        <header className="header">
          <div className="logo-icon">📚</div>
          <h1>큐미르 자동화 시스템</h1>
          <p className="subtitle">읽기전략 &amp; 코넬 노트 분석기</p>
        </header>

        <main className="main-content">
          {/* Upload Area */}
          <div
            className={`upload-area ${file ? 'has-file' : ''}`}
            onClick={() => !file && fileInputRef.current?.click()}
            onDrop={handleDrop}
            onDragOver={handleDragOver}
          >
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileChange}
              accept="image/*"
              style={{ display: 'none' }}
            />
            {preview ? (
              <div className="preview-container">
                <img src={preview} alt="업로드된 지문" className="preview-image" />
                <span className="file-name">{file?.name}</span>
              </div>
            ) : (
              <div className="upload-placeholder">
                <div className="upload-icon">☁️</div>
                <p>클릭하거나 드래그하여 지문 이미지를 업로드하세요</p>
                <span className="upload-hint">지원: JPG, PNG, WEBP</span>
              </div>
            )}
          </div>

          {/* Action Buttons */}
          <div className="btn-group">
            <button
              className={`primary-btn ${isAnalyzing ? 'loading' : ''} ${file ? 'ready' : ''}`}
              onClick={handleAnalyze}
              disabled={isAnalyzing}
            >
              {isAnalyzing ? (
                <>
                  <span className="spinner"></span>
                  <span>AI 분석 중...</span>
                </>
              ) : file ? (
                '🔍 큐미르 분석 시작'
              ) : (
                '📁 이미지 선택'
              )}
            </button>
            {(file || result) && (
              <button className="reset-btn" onClick={handleReset}>
                ↺ 다시 시작
              </button>
            )}
          </div>

          {/* Error Display */}
          {error && (
            <div className="error-box">
              <span>⚠️</span>
              <p>{error}</p>
            </div>
          )}
        </main>

        {/* Analysis Result */}
        {result && <AnalysisResult result={result} />}
      </div>

      <div className="background-decoration blur-1"></div>
      <div className="background-decoration blur-2"></div>
    </div>
  );
}

function AnalysisResult({ result }) {
  return (
    <section className="result-section">
      <h2 className="result-title">📊 큐미르 분석 결과</h2>

      {/* 1순위: 대주제 */}
      <div className="result-card main-topic">
        <div className="card-badge">□ 1순위</div>
        <h3>{result.mainTopic}</h3>
        <span className="card-label">글 전체의 대주제</span>
      </div>

      {/* 2순위 + 3순위: 핵심어 */}
      <div className="keywords-grid">
        {result.keywords?.map((item, idx) => (
          <div className="result-card keyword-card" key={idx}>
            <div className="card-badge secondary">○ 2순위</div>
            {item.relation && (
              <span className={`relation-badge ${item.relation === '→' ? 'causal' : 'contrast'}`}>
                {item.relation} {item.relation === '→' ? '인과관계' : '대조관계'}
              </span>
            )}
            <h3 className="keyword-title">{item.keyword}</h3>
            {item.subItems?.length > 0 && (
              <ul className="sub-items">
                {item.subItems.map((sub, sIdx) => (
                  <li key={sIdx}>
                    <span className="sub-badge">△</span>
                    {sub}
                  </li>
                ))}
              </ul>
            )}
          </div>
        ))}
      </div>

      {/* 논리 관계 */}
      {result.logicRelations?.length > 0 && (
        <div className="result-card">
          <div className="card-badge tertiary">논리 관계</div>
          <ul className="logic-list">
            {result.logicRelations.map((rel, idx) => (
              <li key={idx}>
                <span className={`relation-badge ${rel.type === '인과' ? 'causal' : 'contrast'}`}>
                  {rel.type === '인과' ? '→' : '↔'}
                </span>
                {rel.description}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* 요약 */}
      <div className="result-card summary-card">
        <div className="card-badge summary">💡 핵심 요약</div>
        <p className="summary-text">{result.summary}</p>
      </div>
    </section>
  );
}

export default App;
