/**
 * Periple OEM — Inquiry Receiver
 *
 * 구글 시트에 인콰이어리를 자동 저장하고 본인 메일로도 알림을 보냅니다.
 *
 * 설정 방법:
 * 1. https://sheets.google.com 에서 새 스프레드시트 생성
 * 2. 메뉴 → Extensions → Apps Script
 * 3. 이 파일 전체 내용을 Code.gs 에 붙여넣기
 * 4. 상단 NOTIFY_EMAIL 값을 본인 메일로 변경
 * 5. 저장 후 Deploy → New deployment
 *    - Type: Web app
 *    - Execute as: Me
 *    - Who has access: Anyone
 *    - Deploy → 표시되는 Web app URL 복사
 * 6. 그 URL을 사이트의 data/config.json 의 sheetsEndpoint 에 붙여넣기
 */

const NOTIFY_EMAIL = 'wlstjs3107@gmail.com';
const SHEET_NAME = 'Inquiries';

const HEADERS = [
  'Timestamp',
  'Name',
  'Company',
  'Email',
  'Phone',
  'Country',
  'Quantity',
  'Deadline',
  'Items Count',
  'Items',
  'Message',
  'User Agent',
  'Referrer'
];

function doPost(e) {
  let payload = {};
  try {
    payload = JSON.parse(e.postData.contents);
  } catch (err) {
    return jsonResponse({ status: 'error', message: 'Invalid JSON' });
  }

  const sheet = getOrCreateSheet();
  const items = payload.items || [];

  const itemsText = items
    .map(function (i) {
      const cap = (i.capacities || []).join('/');
      return '· [' + i.id + '] ' + i.name_kr + ' — ' + (i.category || '') + '/' + (i.subcategory || '') +
             ' · ' + cap + 'ml · ' + (i.material || '');
    })
    .join('\n');

  sheet.appendRow([
    new Date(),
    payload.name || '',
    payload.company || '',
    payload.email || '',
    payload.phone || '',
    payload.country || '',
    payload.qty || '',
    payload.deadline || '',
    items.length,
    itemsText,
    payload.message || '',
    payload.userAgent || '',
    payload.referrer || ''
  ]);

  // Email notification
  if (NOTIFY_EMAIL) {
    try {
      const subject = '[Periple OEM] ' + (payload.company || payload.name || '신규 인콰이어리') +
                      ' — ' + items.length + '개 패키지';

      const body = [
        '신규 인콰이어리가 접수되었습니다.',
        '',
        '■ 발신: ' + (payload.name || '-') + ' (' + (payload.company || '-') + ')',
        '■ 이메일: ' + (payload.email || '-'),
        '■ 연락처: ' + (payload.phone || '-'),
        '■ 국가/지역: ' + (payload.country || '-'),
        '■ 수량: ' + (payload.qty || '-'),
        '■ 납기: ' + (payload.deadline || '-'),
        '',
        '■ 관심 패키지 (' + items.length + '개):',
        itemsText || '(없음)',
        '',
        '■ 추가 요청사항:',
        payload.message || '-',
        '',
        '─────────',
        '구글 시트 확인: ' + SpreadsheetApp.getActiveSpreadsheet().getUrl()
      ].join('\n');

      MailApp.sendEmail({
        to: NOTIFY_EMAIL,
        replyTo: payload.email || NOTIFY_EMAIL,
        subject: subject,
        body: body
      });
    } catch (err) {
      // 메일 실패는 시트 저장 성공에 영향 없음
    }
  }

  return jsonResponse({ status: 'ok', received: items.length });
}

function doGet(e) {
  // Health check
  return jsonResponse({ status: 'ok', message: 'Periple OEM Inquiry endpoint is alive' });
}

function getOrCreateSheet() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName(SHEET_NAME);
  if (!sheet) {
    sheet = ss.insertSheet(SHEET_NAME);
  }
  if (sheet.getLastRow() === 0) {
    sheet.appendRow(HEADERS);
    sheet.getRange(1, 1, 1, HEADERS.length).setFontWeight('bold').setBackground('#f0f0f0');
    sheet.setFrozenRows(1);
  }
  return sheet;
}

function jsonResponse(obj) {
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}
