# 음식 선택과 GPT 추천

첫 화면에서 `곁들임 찾기` 또는 `메뉴 고르기`를 선택합니다. 메인 음식·술·직접 요리/배달·원하는 맛·간단한 준비·제외 재료를 정하면 기본 조합을 바로 볼 수 있습니다. 기본 조합은 사전 작성 목록에서 조건으로 필터링하고 음식/술에 맞춰 순위를 매깁니다. GPT가 작성한 것처럼 표시하지 않습니다. 추가 문장 요청은 GPT 경로에서만 반영합니다.

GPT는 같은 조건에 추가 요청과 이전 후보 이름을 더해 새 후보 3개를 제안합니다. 추천에서 마음에 드는 메뉴를 `하고 싶은 일`에 담을 수 있고, 기록이나 캘린더를 자동 생성하지 않습니다. 이름이 다른 식재료까지 완전히 감지하는 알레르기 판정 기능은 아닙니다.

## 현재 동작 범위

- GitHub Pages만 배포해도 기본 조합은 동작합니다. `food.js`는 오프라인 앱 셸에도 포함됩니다.
- GPT 연결용 화면·서버 코드는 포함했지만 서버 배포·API 키 설정은 별도입니다. 이 저장소에서 실제 API 키로 호출하거나 운영 DB에 SQL을 적용하지 않았습니다.
- `config.js`의 `FOOD_AI_ENABLED`는 기본 `false`입니다. 준비되지 않은 상태에서 GPT 응답을 가장하거나 유료 요청을 보내지 않습니다.
- 미설정·오프라인·실패·제한 초과 시 기본 후보를 유지합니다. 선택 조건이 바뀌면 이전 요청 결과를 버립니다.

## 서버 설정

기존 Supabase 프로젝트에 Edge Function 하나와 전용 사용량 테이블/함수를 추가합니다. 기존 `rooms.data`를 읽거나 수정하지 않습니다. 브라우저의 공개 Supabase 키는 OpenAI 키를 대신할 수 없습니다.

1. Supabase SQL Editor에서 [사용량 SQL](../supabase/migrations/202610260001_food_recommendation_quota.sql)을 실행합니다. 이 파일만 적용하면 됩니다. 기존 DB에 대해 전체 초기화나 새 프로젝트 생성은 하지 않습니다.
2. Supabase Dashboard의 Edge Function Secrets에 아래 항목을 설정합니다. 실제 비밀 값은 `config.js`·Git·채팅에 넣지 않습니다.

| 서버 환경 변수 | 값 |
| --- | --- |
| `OPENAI_API_KEY` | OpenAI 프로젝트 API 키 |
| `OPENAI_MODEL` | 계정에서 사용 가능한 Responses + Structured Outputs 지원 모델 ID |
| `FOOD_ALLOWED_ROOMS` | 허용할 기존 방 코드의 JSON 배열. 예: `["실제 방 코드"]` |
| `FOOD_ALLOWED_ORIGINS` | 배포 웹앱 origin의 JSON 배열. 기본 예: `["https://easthyeok.github.io"]` |

`SUPABASE_URL`·`SUPABASE_SERVICE_ROLE_KEY`는 Edge Function 런타임이 주입하는 서버 환경 변수를 사용합니다. service-role 키는 브라우저로 보내지 않습니다. 로컬 개발에는 `supabase/functions/.env.example`을 `.env`로 복사해 사용할 수 있으며 `.env`는 Git에서 제외합니다.

3. Supabase CLI를 사용할 수 있는 환경에서 저장소 루트에서 배포합니다.

```sh
supabase functions deploy food-recommend --project-ref xfnbrxltbvnxtkuatqxo
```

`supabase/config.toml`의 해당 함수만 `verify_jwt = false`입니다. 앱은 현재 Supabase Auth 대신 방 코드를 사용하므로 함수 내부에서 허용 방 목록을 검사합니다. 빈 허용 목록이나 미설정 키/모델은 호출을 허용하지 않습니다. 이 방식은 기존 방 코드의 비밀성에 의존하며 강한 사용자 인증을 추가한 것은 아닙니다. 허용 origin 검사만으로 사용자를 인증하지 않습니다.

4. 서버를 설정한 뒤 `config.js`에서 `FOOD_AI_ENABLED: true`로 바꿔 Pages에 반영합니다. API 주소는 기존 `SUPABASE_URL`의 `/functions/v1/food-recommend`로 계산됩니다.
5. 실제 앱에서 GPT 후보와 재요청을 확인합니다. 잘못된 방 코드, 허용하지 않은 origin, 키 미설정, 사용량 한도 오류도 확인합니다.

## 요청과 비용 범위

- OpenAI에는 음식 조건·추가 요청·이전 후보 이름만 전달합니다. 방 코드·일기·사진·전체 공유 데이터를 전송하지 않습니다.
- Responses API의 Structured Outputs로 후보 3개의 `name`·`reason`·`preparation`을 받으며 서버와 화면에서 다시 형식을 검증합니다. `store: false`, 출력 한도 1,400토큰, 서버 시간 제한 20초를 사용합니다.
- 모델은 서버에서만 설정합니다. 브라우저 요청으로 모델·출력 한도·API 목적지를 바꿀 수 없습니다.
- UTC 날짜 기준 방당 20회, 전체 100회, 같은 방 10초 간격을 DB 트랜잭션에서 제한합니다. 사용량 저장소를 사용할 수 없으면 GPT 호출을 중단합니다.
- 허용된 요청은 모델 실패에도 한도를 소비합니다. 제한은 반복 과금을 줄이는 장치이며 원화 기준 지출 상한은 아닙니다. 단가는 선택한 모델에 따라 달라집니다.
- 모델 출력은 실행하거나 HTML로 삽입하지 않고 텍스트로 렌더링합니다.

## 검증

```sh
node tests/food.cjs
node tests/food-api.mjs
node tests/app-upgrade.cjs
node tests/pwa.cjs
node tests/recovery.cjs
```

음식 필터·조합 순위·다른 후보·저장 중복 방지·추가 조건 전달·중복 클릭·오래된 응답 차단·실패 시 기존 후보 보존·입력 제한·허용 방/origin·사용량 저장소 실패·구조화 응답·상위 API 오류를 모의 응답으로 검증합니다. 운영 PostgreSQL에서 사용량 SQL 실행, Supabase Deno 런타임 배포, 실제 모델 호출, 브라우저 화면 확인은 별도입니다.

공식 문서: [OpenAI Structured Outputs](https://developers.openai.com/api/docs/guides/structured-outputs?api-mode=responses), [Supabase 함수 설정](https://supabase.com/docs/guides/functions/function-configuration), [Supabase 서버 환경 변수](https://supabase.com/docs/guides/functions/secrets).
