#!/bin/bash

# =========================================================
# Qmir Project Local Development Runner (MacOS M1/M2/M3)
# =========================================================

echo "========================================================="
echo "🚀 큐미르 자동화 시스템 로컬 개발 환경 시작"
echo "========================================================="

# 1. Setup VITE environment variables for React
echo "⚙️ 프론트엔드 환경 변수 설정 중..."
if [ -f ".env" ]; then
    # Convert ROOT .env to VITE_ prefixed version for React
    cat .env | awk '{
        if ($0 ~ /^SUPABASE_URL=/) { print "VITE_" $0 }
        else if ($0 ~ /^SUPABASE_ANON_KEY=/) { print "VITE_" $0 }
    }' > frontend/.env.local
fi

# 2. Start Frontend (React) in foreground
echo "⚛️ 프론트엔드(React) 서버 시작 중 (포트: 5173)..."
echo "🌐 브라우저가 곧 열립니다. 창이 열리면 결과를 확인해주세요!"
echo "중지하려면 [Ctrl + C] 를 누르세요."
cd frontend
npm run dev -- --open
