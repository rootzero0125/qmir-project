import { useState, useRef } from 'react';
import { supabase } from './lib/supabaseClient';
import './App.css';

function App() {
  const [file, setFile] = useState(null);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef(null);

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
    }
  };

  const handleUploadClick = () => {
    if (!file) {
      fileInputRef.current?.click();
    } else {
      // Create a mock upload flow for now
      setIsUploading(true);
      setTimeout(() => {
        setIsUploading(false);
        alert('지문 이미지가 성공적으로 업로드 되었습니다! (Mock)');
      }, 1500);
    }
  };

  return (
    <div className="app-container">
      <div className="glass-panel">
        <header className="header">
          <div className="logo-icon">📚</div>
          <h1>큐미르 자동화 시스템</h1>
          <p className="subtitle">읽기전략 & 코넬 노트 분석기</p>
        </header>

        <main className="main-content">
          <div 
            className={`upload-area ${file ? 'has-file' : ''}`}
            onClick={() => fileInputRef.current?.click()}
          >
            <input 
              type="file" 
              ref={fileInputRef} 
              onChange={handleFileChange} 
              accept="image/*" 
              style={{ display: 'none' }} 
            />
            {file ? (
              <div className="file-info">
                <span className="file-icon">📄</span>
                <span className="file-name">{file.name}</span>
              </div>
            ) : (
              <div className="upload-placeholder">
                <div className="upload-icon">☁️</div>
                <p>클릭하여 지문 이미지를 업로드하세요</p>
                <span className="upload-hint">지원: JPG, PNG, WEBP</span>
              </div>
            )}
          </div>

          <button 
            className={`primary-btn ${isUploading ? 'loading' : ''} ${file ? 'ready' : ''}`}
            onClick={handleUploadClick}
            disabled={isUploading}
          >
            {isUploading ? (
              <span className="spinner"></span>
            ) : file ? (
              '이미지 분석 시작'
            ) : (
              '이미지 선택'
            )}
          </button>
        </main>
      </div>
      
      <div className="background-decoration blur-1"></div>
      <div className="background-decoration blur-2"></div>
    </div>
  );
}

export default App;
