# 📊 Google Sheets 인콰이어리 연동 가이드

페리플 OEM 사이트 인콰이어리 폼이 자동으로 **구글 시트에 행으로 추가** 되고, 동시에 본인 메일로 알림이 오게 설정합니다.

소요 시간: **5분**, 비용: **무료**

---

## 1단계 — 새 구글 시트 만들기

1. https://sheets.google.com 접속
2. 우측 하단 **"+"** 버튼 → 빈 스프레드시트 생성
3. 이름을 **"Periple OEM Inquiries"** 같은 알아볼 수 있는 이름으로 변경

> 💡 시트 이름은 자유. 중요한 건 다음 단계의 Apps Script.

---

## 2단계 — Apps Script 열기 + 코드 붙여넣기

1. 시트 상단 메뉴 → **확장 프로그램(Extensions)** → **Apps Script**
2. 새 탭이 열리며 코드 에디터가 표시됨
3. 기본으로 들어있는 `function myFunction() { }` 전체 삭제
4. 아래 파일을 열어서 **모든 내용 복사**:
   👉 [`apps-script/Code.gs`](apps-script/Code.gs)
5. 코드 에디터에 **붙여넣기** (Cmd+V)
6. 상단 디스크 아이콘 클릭 또는 **Cmd+S** 로 저장
   - 프로젝트 이름은 자유 (예: "Periple Inquiry")

### 알림 메일 주소 변경 (선택)

코드 상단을 보면:
```javascript
const NOTIFY_EMAIL = 'wlstjs3107@gmail.com';
```

본인 메일이 아니면 이 부분 변경. 알림 안 받으려면 빈 문자열 `''` 로.

---

## 3단계 — 웹 앱으로 배포

1. Apps Script 우측 상단 **"Deploy" → "New deployment"**
2. **톱니바퀴 아이콘 (Select type)** 클릭 → **"Web app"** 선택
3. 입력란:

| 항목 | 값 |
|---|---|
| Description | `Periple OEM Inquiry v1` (자유) |
| Execute as | **Me (wlstjs3107@gmail.com)** |
| Who has access | **Anyone** ← 중요. 사이트 방문자가 익명으로 폼 제출하므로 |

4. **Deploy** 클릭

### 권한 승인 (첫 배포 시 한 번만)

1. **"Authorize access"** 팝업 → 본인 구글 계정 선택
2. **"Advanced"** → **"Go to ___ (unsafe)"** 클릭
   > Google이 자동 검증되지 않은 앱이라고 경고 — 본인이 만든 거라 안전
3. **Allow** 클릭

### Web App URL 복사

배포 완료 화면에 나오는 URL을 **전체 복사**:

```
https://script.google.com/macros/s/AKfycbxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx/exec
```

---

## 4단계 — 사이트에 URL 연결

복사한 URL을 사이트의 [`data/config.json`](data/config.json) 파일에 붙여넣어야 합니다.

### 방법 A — GitHub 웹에서 편집 (가장 쉬움)

1. https://github.com/periple-global/periple-global.github.io/blob/main/data/config.json
2. 우측 상단 **연필 아이콘** (Edit this file) 클릭
3. `"sheetsEndpoint": ""` 안에 URL 붙여넣기:
   ```json
   {
     "sheetsEndpoint": "https://script.google.com/macros/s/AKfyc.../exec",
     "fallbackEmail": "wlstjs3107@gmail.com"
   }
   ```
4. 하단 **Commit changes** 클릭

### 방법 B — 로컬에서 편집 후 push

```bash
cd "/Users/peripleglobal/Desktop/vibe/페리플글로벌/용기사업"
# data/config.json 의 sheetsEndpoint 값을 URL로 변경 (텍스트 에디터)
git add data/config.json
git commit -m "feat: connect inquiry form to Google Sheets"
git push
```

→ 1~2분 안에 https://periple-global.github.io/ 에 자동 반영.

---

## 5단계 — 테스트

1. https://periple-global.github.io/inquiry.html 접속
2. 폼에 더미 데이터 입력 + 패키지 1~2개 카탈로그에서 카트에 담기
3. **인콰이어리 보내기** 클릭
4. 화면 하단에 **"인콰이어리가 전송되었습니다 ✓"** 토스트 확인
5. 구글 시트로 돌아가서 **`Inquiries`** 탭에 새 행 추가됐는지 확인
6. 본인 메일로도 알림 도착 확인

---

## 📋 시트에 저장되는 컬럼

| 컬럼 | 내용 |
|---|---|
| Timestamp | 자동 |
| Name / Company / Email / Phone | 폼 입력값 |
| Country / Quantity / Deadline | 폼 입력값 |
| Items Count | 카트에 담긴 SKU 개수 |
| Items | 담긴 모델 정보 (id · 이름 · 용량 · 소재) |
| Message | 추가 요청사항 |
| User Agent / Referrer | 방문자 환경 (디버깅용) |

---

## 🔧 트러블슈팅

### "전송 실패" 토스트가 뜨면

- Apps Script 배포 시 **"Who has access: Anyone"** 인지 확인
- Web App URL 끝이 `/exec` 로 끝나는지 확인 (`/dev` 아님)
- config.json 의 URL 양 끝에 따옴표 빠지지 않았는지 확인

### 시트에 행은 들어가는데 메일이 안 오면

- Apps Script 코드의 `NOTIFY_EMAIL` 값이 본인 메일인지 확인
- 첫 배포 시 권한 승인을 했는지 확인 (안 했으면 다시 Deploy → Authorize)

### Apps Script 코드를 수정한 후

코드를 변경하면 **다시 배포**해야 적용됩니다:
- Deploy → Manage deployments → 우측 연필 아이콘 → Version: New version → Deploy

(URL은 그대로 유지됨)

---

## 🎯 부가 기능 — Slack 알림 (선택)

Apps Script에 다음을 추가하면 Slack 채널로도 알림 갑니다:

```javascript
const SLACK_WEBHOOK = 'https://hooks.slack.com/services/XXX/YYY/ZZZ';

// doPost 함수 안 마지막 부분에 추가
if (SLACK_WEBHOOK) {
  UrlFetchApp.fetch(SLACK_WEBHOOK, {
    method: 'post',
    contentType: 'application/json',
    payload: JSON.stringify({
      text: '[Periple OEM] 신규 인콰이어리: ' + payload.name + ' (' + items.length + '개 패키지)'
    })
  });
}
```

---

문제 있으면 알려주세요. 시트 URL을 받자마자 자동 배포 도와드립니다.
