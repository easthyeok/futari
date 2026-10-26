# 음식 선택과 Gemini 추천

첫 화면에서 질문 하나에 답하면 다음 질문으로 넘어갑니다. 메인이 정해졌는지 묻고 음식 종류·메인 음식·술·조리 방식·맛을 차례로 고릅니다. 필요 없는 질문은 생략하며 이전 답변을 수정할 수 있습니다. 종류별 음식 예시 외에도 어떤 이름이든 직접 입력할 수 있습니다. 기본 추천은 94개 메뉴를 필터링하고 순위를 매기며 다른 추천은 전체 후보를 순회합니다.

마지막 질문 뒤 Gemini 연결이 설정되어 있으면 추천을 요청합니다. 추가 문장·제외 재료·최근 후보 최대 12개도 함께 전달합니다. Gemini는 기본 목록에 갇히지 않고 서로 다른 메뉴 3개를 제안합니다. 마음에 드는 메뉴는 ‘하고 싶은 일’에 담을 수 있고 캘린더·기록을 자동 생성하지 않습니다. 재료 필터는 이름이 다른 모든 식재료를 감지하는 알레르기 판정 기능은 아닙니다.

## 현재 상태

- 화면과 서버 코드를 Gemini 전용으로 변경했습니다. 실제 서버 배포·비밀 등록·실제 모델 호출은 아직 하지 않았습니다.
- 기본 추천은 서버 없이 동작하고 오프라인 셸에도 포함됩니다. `FOOD_AI_ENABLED`는 실제 설정 완료 전까지 `false`입니다.
- API 경로는 `/functions/v1/food-recommend-gemini`입니다. 예전 OpenAI 함수 `/food-recommend`를 호출하지 않습니다. OpenAI 키를 읽거나 다른 AI/모델로 자동 전환하는 코드도 없습니다.
- 한도 초과·실패·응답 지연 때 기존 기본 추천을 유지하거나 기본 추천으로 전환합니다. 자동 재시도하지 않습니다. 선택 조건을 바꾸면 오래된 요청 결과를 버립니다.

## 무료로 시작하는 설정 순서

1. [Google AI Studio](https://aistudio.google.com/)에서 **무료 등급 프로젝트**의 Gemini API 키를 발급합니다. Google Cloud Billing이 연결된 유료 프로젝트의 키는 사용하지 않습니다. AI Studio에서 해당 프로젝트의 요금 등급과 모델 사용 가능 여부를 확인하세요.
2. 기존 Supabase 프로젝트의 SQL Editor에서 [사용량 SQL](../supabase/migrations/202610260001_food_recommendation_quota.sql)을 실행합니다. 이미 실행했다면 다시 할 필요 없습니다. 기존 `rooms.data`는 읽거나 수정하지 않습니다.
3. Supabase Dashboard → Edge Functions → Secrets에 다음을 저장합니다. 실제 키는 채팅·Git·`config.js`에 넣지 않습니다.

| 서버 환경 변수 | 값 |
| --- | --- |
| `GEMINI_API_KEY` | Google AI Studio에서 발급한 무료 프로젝트 키 |
| `GEMINI_MODEL` | `gemini-3.5-flash-lite` (생략해도 이 모델 사용) |
| `FOOD_ALLOWED_ROOMS` | 허용할 방 코드의 JSON 배열. 예: `["실제 방 코드"]` |
| `FOOD_ALLOWED_ORIGINS` | `["https://easthyeok.github.io"]` |

서버 코드는 현재 무료 입력·출력이 제공되는 이 모델 ID만 허용합니다. **모델 ID 제한만으로 Google 프로젝트의 무료 등급을 검증하는 것은 아닙니다.** 유료 프로젝트 키를 넣으면 같은 모델도 과금될 수 있으므로 프로젝트 요금 등급 확인이 필요합니다. 무료 제공 모델·한도는 변경될 수 있으며 계정의 실제 제한이 적용됩니다.

`SUPABASE_URL`과 `SUPABASE_SERVICE_ROLE_KEY`는 Supabase Edge Function이 주입하는 서버 환경 변수를 사용합니다. 서비스 키는 브라우저로 보내지 않습니다. 로컬 환경 파일은 `supabase/functions/.env.example`에서 `.env`로 복사할 수 있고 `.env`는 Git에서 제외됩니다.

4. Supabase CLI에 로그인한 환경에서 저장소 루트에서 서버 함수를 배포합니다.

```sh
supabase functions deploy food-recommend-gemini --project-ref xfnbrxltbvnxtkuatqxo
```

기존 OpenAI 함수는 이 배포로 갱신되지 않고 새 Gemini 함수가 생깁니다. 예전 함수가 실제 배포되어 있다면 별도로 관리/삭제할 수 있으나 앱은 그 주소를 사용하지 않습니다. OpenAI 비밀은 새 함수에서 읽지 않으므로 설정할 필요 없습니다.

이 함수는 `supabase/config.toml`에서 `verify_jwt = false`로 설정합니다. 앱은 현재 Supabase Auth 대신 방 코드를 사용하므로 함수 내부의 허용 방 목록과 사용량 제한으로 호출을 관리합니다. 빈 허용 목록·잘못된 모델·미설정 키는 요청을 거절합니다. 기존 방 코드의 비밀성에 의존하며 강한 사용자 인증을 추가한 것은 아닙니다. CORS 검사를 사용자 인증으로 취급하지 않습니다.

5. 서버를 설정한 뒤 `config.js`의 `FOOD_AI_ENABLED: true`를 반영합니다. 앱에서 선택을 마치면 Gemini에 물어보고 ‘Gemini가 고른 조합’으로 표시하는지 확인합니다. 429/미설정/오류에는 기본 조합으로 전환하는지도 확인합니다.

## 요청·한도·개인정보

- Google에는 선택한 음식 조건·추가 요청·이전 메뉴 이름만 보냅니다. 방 코드·일기·사진·전체 공유 데이터는 보내지 않습니다.
- Google 공식 문서에서 `gemini-3.5-flash-lite`는 무료 등급의 입력·출력이 무료로 표시됩니다. 무료 한도·사용 가능 여부는 프로젝트에 따라 확인해야 합니다. 무료 등급은 내용이 Google 제품 개선에 사용될 수 있습니다.
- 새 서버는 Google `generateContent` API에 키를 헤더로 전달합니다. URL에 키를 넣지 않습니다. 출력은 JSON Schema로 요청하고 서버/화면에서 메뉴 개수·문자열·중복을 다시 검증합니다. 사고 과정으로 표시된 텍스트는 메뉴로 파싱하지 않습니다.
- 모델은 서버에서 지정한 ID만 허용합니다. 브라우저 요청으로 모델·키·API 주소를 바꿀 수 없습니다. 웹 검색·지도·다른 유료 도구를 요청하지 않습니다.
- 출력 한도 1,400토큰·20초 타임아웃을 적용합니다. 한도나 실패에도 유료 제공자로 전환하거나 자동 재시도하지 않습니다.
- 자체 제한은 UTC 날짜 기준 방당 20회·전체 100회·같은 방 10초 간격입니다. Gemini의 실제 무료 한도가 더 작으면 먼저 제한될 수 있습니다. 요청 실패도 자체 한도를 소비합니다. 사용량 DB가 작동하지 않으면 AI 호출을 중단합니다.
- 이는 **Gemini API 무료 등급을 쓰는 설정**이며 Supabase 등 외부 서비스 전체 비용을 보증하는 것은 아닙니다. 외부 서비스는 각 계정의 요금제와 한도를 따릅니다.

## 검증

```sh
node tests/food.cjs
node tests/food-api.mjs
node tests/app-upgrade.cjs
node tests/pwa.cjs
node tests/recovery.cjs
```

화면 전환·분기·답 유지·재시작·94개 기본 후보·저장 중복 방지·Gemini 전달 데이터·중복 클릭·오래된 응답·무료 한도/오류의 기본 추천 전환·입력 제한·허용 방/origin·사용량 DB 실패·Gemini JSON 응답/차단/미완성 응답·키 노출 방지를 모의 응답으로 검증합니다. 운영 SQL·Deno 런타임·실제 모델·실제 브라우저는 별도 확인이 필요합니다.

공식 문서: [Gemini 무료·유료 가격](https://ai.google.dev/gemini-api/docs/pricing), [Gemini 키 관리](https://ai.google.dev/gemini-api/docs/api-key), [구조화 출력](https://ai.google.dev/gemini-api/docs/generate-content/structured-output), [Supabase 서버 비밀](https://supabase.com/docs/guides/functions/secrets).
