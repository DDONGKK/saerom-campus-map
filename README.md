# 새롬길 — Campus Map & Quest

새롬고등학교의 제공 평면도를 활용한 오프라인 우선 교내 안내 웹서비스입니다. 장소·별칭·부서·공개 교사 데이터 검색, 층별 지도, 텍스트 이동 안내, QR 확인과 탐방 퀴즈를 하나의 장소 데이터로 연결합니다.

## 실행 방법

`index.html`을 브라우저에서 직접 엽니다. `fetch`, ES module, 외부 CDN을 쓰지 않아 서버 없이 주요 기능이 작동합니다. 필요하면 이 폴더에서 `python -m http.server 8000`을 실행한 뒤 `http://localhost:8000`을 엽니다.

## 파일 구조

- `index.html`: 화면 구조와 스크립트 연결
- `styles.css`: 픽셀풍 반응형 디자인과 접근성 모드
- `data.js`: `window.SAEROM_DATA` 장소·부서·교사·탐방 데이터
- `app.js`: 검색, 지도, 길안내, 탐방, 저장 로직
- `assets/maps/`: 원본을 변경하지 않고 복사한 6개 평면도
- `PROGRESS.md`, `TEST_CHECKLIST.md`: 구현 기록과 검증 결과

## 데이터와 지도 관리

평면도는 `assets/maps`의 같은 파일명으로 교체합니다. 자르거나 비율을 바꾸지 말고 원본 비율을 유지하세요. 이미지 경로는 `data.js`의 `floors`에서 한곳에 관리합니다.

장소와 별칭은 `data.js`의 `places` 항목에서 수정합니다. `mapX`, `mapY`는 이미지 왼쪽 위를 `(0, 0)`, 오른쪽 아래를 `(100, 100)`으로 보는 백분율 좌표입니다. 브라우저에서 해당 층을 보며 조정하세요. 현재 16곳의 좌표는 제공 이미지 육안 판독값이므로 모두 `needsCoordinateReview: true`입니다. 실제 운영 전 학교 담당자가 최종 확인해야 합니다.

부서는 `departments`에 추가하고 `basePlaceId`가 실제 장소 ID를 가리키게 합니다. 교사는 공개 동의를 받은 정보만 `teachers`에 추가하고 `isPublic: true`로 설정하세요. 이름·과목·소속·공개 직책·기본 근무 공간 외 개인정보는 넣지 마세요. 이 서비스는 사생활과 안전을 위해 교사의 실시간 위치, 시간표, 개인 일정, 전화번호를 사용하지 않습니다.

공식 QR은 `qrCodes` 허용 목록에 코드와 장소 ID를 추가하고, 장소의 `officialQrCode`도 맞춥니다. 카메라 스캔이나 외부 이동은 하지 않습니다. 탐방은 `quests.placeIds`, 퀴즈는 `quizzes`에서 추가합니다. 모든 참조 ID는 앱 시작 시 `validateData()`가 검사하며, 잘못된 항목 하나가 앱 전체를 중단시키지 않도록 했습니다.

## 저장과 개인정보

사용 키: `saeromQuest_userType`, `saeromQuest_completedPlaces`, `saeromQuest_badges`, `saeromQuest_currentStep`, `saeromSettings_largeText`, `saeromSettings_highContrast`. 초기화는 `saeromQuest_` 키만 삭제합니다. 로그인·이름·전화번호·학번·생년월일을 수집하지 않으며 GPS, Wi-Fi 위치, 카메라, 마이크를 요청하지 않습니다.

## GitHub Pages 배포 전

학교의 게시 승인, 지도 공개 범위, 장소 명칭·좌표, 실제 교사 공개 동의, 공식 QR 코드, 접근성·모바일 테스트를 다시 확인하세요. `data.js`가 `app.js`보다 먼저 로드되는지, 파일명 대소문자가 정확한지 확인하세요.
