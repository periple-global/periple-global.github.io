# Periple OEM / ODM

페리플글로벌의 OEM/ODM 패키지 사업부 공식 정적 웹사이트.
화장품 용기 카탈로그 + 브랜딩 솔루션을 한 창구에서 제공합니다.

## 사이트 구조

```
용기사업/
├── index.html          메인
├── package.html        패키지 카탈로그 (필터 + 그리드 + 모달 + 카트)
├── solutions.html      브랜딩 / 패키지 디자인 솔루션 5종
├── standards.html      검증된 4개 제조 네트워크 (NDA 보호)
├── partners.html       (→ standards.html 으로 redirect)
├── process.html        개발 프로세스 6단계
├── about.html          회사소개
├── inquiry.html        인콰이어리 카트 + 문의 폼
│
├── assets/
│   ├── css/main.css
│   ├── js/main.js      (Catalog · Cart · Modal · Inquiry)
│   ├── images/
│   │   ├── placeholder.jpg       카드 fallback 이미지
│   │   └── products-new/         (★ 사용자가 사진 채울 폴더 — README 참고)
│   │       ├── 01_skincare/
│   │       ├── 02_makeup/
│   │       └── 03_special/
│
└── data/
    ├── products.json   42개 SKU (카테고리·서브·용량·소재·usage·volume)
    ├── partners.json   4개 익명 네트워크 (A/B/C/D)
    └── solutions.json  5개 브랜딩 솔루션
```

## 로컬 미리보기

```bash
cd 용기사업
python3 -m http.server 8765
# http://localhost:8765
```

## GitHub Pages 배포

1. 이 폴더를 신규 GitHub repository에 push
2. **Settings → Pages → Source: `main` branch / root** 선택
3. 별도 도메인 연결 시 `CNAME` 파일에 도메인 적고 DNS A/CNAME 레코드 설정

## 핵심 기능

- **익명화 카탈로그** — 제조사명 노출 0건. NDA 단계에서 공개
- **인콰이어리 카트** (localStorage) — 관심 패키지 모아 한 번에 메일 발송
- **다축 필터** — Category × Container × Usage × Volume × Material
- **딥링크** — `?cat=skincare`, `?sub=tube`, `?partner=A` 자동 인식
- **솔루션 5종** — 브랜드 전략 / CI·BI / 네이밍 / 패키지 디자인 / 에디토리얼

## 이미지 업로드

`assets/images/products-new/README.md` 참고. 카테고리별 폴더에 자유 파일명으로 사진을 넣으면 자동 카탈로그 갱신.

## 안전장치

`.gitignore`로 다음을 GitHub에 올리지 않음:
- 원본 PDF (NDA 보호 자산, 파일명에 제조사명 노출)
- `_pdf_pages/` (PDF 페이지 추출 작업물)
- `_placeholders/` (PDF 페이지 그대로 — 제조사 로고 노출)

→ GitHub Pages에서 이미지 누락 시 `placeholder.jpg`로 fallback.
