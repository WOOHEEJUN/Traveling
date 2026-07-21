import Anthropic from "@anthropic-ai/sdk";
import {
  TRIP_STYLES,
  type ItineraryDay,
  type OverseasInfo,
} from "./types";
import { formatDriveTime, nightsLabel } from "./distance";

// 모듈 로드 시점에 만들면 환경변수가 아직 안 올라와 있을 수 있어서 지연 생성
let client: Anthropic | null = null;
function getClient(): Anthropic {
  if (!client) client = new Anthropic();
  return client;
}

/** Claude가 돌려주는 추천 1건 */
export interface PlannedPlace {
  type: "stay" | "food" | "dessert" | "activity";
  name: string;
  searchKeyword: string;
  note: string;
  priceLevel: "가성비" | "보통" | "프리미엄";
}

export interface PlannedOption {
  regionName: string;
  searchKeyword: string;
  summary: string;
  stayAreaNote: string;
  itinerary: ItineraryDay[];
  places: PlannedPlace[];
}

export interface PlanRequest {
  origin: string;
  startDate: string;
  endDate: string;
  nights: number;
  style: string;
  wantsDessert: boolean;
  maxOneWayMinutes: number;
  /** 최근에 이미 다녀온 지역 — 중복 추천을 피하기 위해 전달 */
  recentRegions: string[];
}

const SYSTEM_PROMPT = `당신은 13년차 국내여행 플래너입니다. 커플 여행 코스를 짜는 일을 오래 해왔고, 특히 "실제로 가능한 동선"에 엄격합니다.

## 이 커플의 상황
- 남자친구는 인천에 살고 서울로 출근하며, 자차가 있습니다.
- 여자친구는 정선에 살고 차가 없습니다.
- 그래서 두 사람은 보통 중간 지점에서 만나 거기서 함께 출발합니다.
- 만나면 보통 1박2일 또는 2박3일을 함께 보냅니다.

## 추천 원칙
1. **이동시간이 최우선 제약입니다.** 주어진 "편도 이동 허용시간"을 넘는 지역은 절대 추천하지 마세요. 1박2일에 부산을 가면 왕복에 하루를 다 쓰게 됩니다. 애매하면 더 가까운 곳을 고르세요.
2. **실존하는 구체적인 장소만** 추천하세요. "OO 근처 카페" 같은 뭉뚱그린 표현 말고, 실제 상호명을 쓰세요. 확실하지 않은 상호는 넣지 마세요.
3. **여행 스타일에 따라 코스의 무게중심을 확실히 바꾸세요.** 스타일이 다르면 같은 지역이라도 완전히 다른 코스가 나와야 합니다. 스타일과 상관없이 비슷한 코스를 내놓으면 안 됩니다.
4. 각 후보는 **성격이 뚜렷하게 달라야** 합니다. 바다 / 산 / 도심 / 온천처럼 결이 다른 선택지를 주세요.
5. 계절과 날짜를 고려하세요. 겨울에 해수욕장, 한여름에 등산 코스 같은 추천은 피하세요.
6. 코스는 실제 동선 순서대로, 이동에 걸리는 시간까지 감안해서 짜세요.
7. 장소마다 대략의 가격대(가성비/보통/프리미엄)를 표시하되, 특정 가격대만 고집하지는 마세요. 스타일에 맞으면 됩니다.

## 말투
과장하지 말고, 오래 이 일을 해온 사람처럼 담백하고 구체적으로 쓰세요. "환상적인", "인생 여행" 같은 홍보 문구는 쓰지 마세요. 왜 이 조합을 골랐는지 이유를 짧고 분명하게 설명하세요.`;

const ITINERARY_SCHEMA = {
  type: "array",
  description: "일자별 코스",
  items: {
    type: "object",
    properties: {
      day: { type: "integer", description: "1부터 시작하는 일차" },
      title: { type: "string", description: "그날의 한 줄 요약" },
      detail: {
        type: "string",
        description: "시간 흐름에 따른 구체적인 동선",
      },
    },
    required: ["day", "title", "detail"],
    additionalProperties: false,
  },
} as const;

const PLACES_SCHEMA = {
  type: "array",
  description:
    "실존하는 구체적 장소들. 총 6~10곳. 개수 배분은 여행 스타일을 따르세요. " +
    "호캉스면 서로 성격이 다른 숙소 후보(뷰·스파·가성비 등)를 3~5곳 stay 타입으로 넣어 " +
    "그중 하나를 고를 수 있게 하고 나머지는 적게, 관광위주면 놀거리를 많이, " +
    "맛집탐방이면 끼니 수만큼 맛집을 넉넉히 넣으세요.",
  items: {
    type: "object",
    properties: {
      type: {
        type: "string",
        enum: ["stay", "food", "dessert", "activity"],
      },
      name: { type: "string", description: "실제 상호명" },
      searchKeyword: {
        type: "string",
        description:
          "지도에서 이 장소를 찾기 위한 검색어. 지역명을 앞에 붙이세요. 예: '강릉 테라로사 커피공장'",
      },
      note: {
        type: "string",
        description: "플래너로서 한 줄 코멘트. 뭘 시키면 좋은지 등",
      },
      priceLevel: {
        type: "string",
        enum: ["가성비", "보통", "프리미엄"],
      },
    },
    required: ["type", "name", "searchKeyword", "note", "priceLevel"],
    additionalProperties: false,
  },
} as const;

const RESPONSE_SCHEMA = {
  type: "object",
  properties: {
    options: {
      type: "array",
      description: "서로 성격이 다른 여행지 후보 3개",
      items: {
        type: "object",
        properties: {
          regionName: {
            type: "string",
            description: "여행지 이름. 예: '강릉', '단양', '속초'",
          },
          searchKeyword: {
            type: "string",
            description:
              "이 지역의 중심 좌표를 찾기 위한 지도 검색어. 예: '강릉시청', '단양역'",
          },
          summary: {
            type: "string",
            description: "왜 이 조건에 이 지역을 골랐는지 2~3문장으로",
          },
          stayAreaNote: {
            type: "string",
            description: "숙소를 어느 동네에 잡는 게 좋은지와 그 이유",
          },
          itinerary: ITINERARY_SCHEMA,
          places: PLACES_SCHEMA,
        },
        required: [
          "regionName",
          "searchKeyword",
          "summary",
          "stayAreaNote",
          "itinerary",
          "places",
        ],
        additionalProperties: false,
      },
    },
  },
  required: ["options"],
  additionalProperties: false,
} as const;

function buildUserPrompt(req: PlanRequest): string {
  const style = TRIP_STYLES.find((t) => t.key === req.style);

  const lines = [
    `## 이번 여행 조건`,
    `- 출발지: ${req.origin} (두 사람이 여기서 만나 차로 함께 출발)`,
    `- 날짜: ${req.startDate} ~ ${req.endDate} (${nightsLabel(req.nights)})`,
    `- 편도 이동 허용시간: ${formatDriveTime(req.maxOneWayMinutes)} 이내`,
    `- **여행 스타일: ${style?.label ?? req.style}** — ${style?.description ?? ""}`,
  ];

  if (req.style === "hotel") {
    lines.push(
      `- 호캉스이므로 **서로 성격이 다른 숙소 후보를 3~5곳** stay 타입으로 넣어주세요 (오션뷰/스파/신축/가성비 등). 둘이 보고 하나를 고를 수 있게 각 숙소의 장단점을 note에 분명히 쓰세요.`,
    );
  }

  if (req.wantsDessert) {
    lines.push(
      `- **여자친구가 빵과 디저트를 좋아합니다.** 후보마다 빵집이나 디저트 카페를 최소 1곳씩 dessert 타입으로 꼭 넣어주세요.`,
    );
  }

  if (req.recentRegions.length > 0) {
    lines.push(
      `- 최근에 다녀온 곳: ${req.recentRegions.join(", ")} — 이번엔 다른 곳으로 추천해주세요.`,
    );
  }

  lines.push(
    ``,
    `위 조건으로 성격이 뚜렷하게 다른 여행지 후보 3개를 짜주세요.`,
  );

  return lines.join("\n");
}

const MODEL = "claude-sonnet-5";

/**
 * claude-sonnet-5 단가 (USD / 100만 토큰).
 * 2026-08-31까지는 도입 할인가($2/$10)라 실제 청구는 이보다 적게 나옵니다.
 */
const PRICE_PER_MTOK = { input: 3, output: 15, cacheRead: 0.3 };

function logUsage(usage: Anthropic.Usage) {
  const input = usage.input_tokens ?? 0;
  const output = usage.output_tokens ?? 0;
  const cacheRead = usage.cache_read_input_tokens ?? 0;

  const cost =
    (input / 1e6) * PRICE_PER_MTOK.input +
    (output / 1e6) * PRICE_PER_MTOK.output +
    (cacheRead / 1e6) * PRICE_PER_MTOK.cacheRead;

  console.log(
    `[여행추천 사용량] 입력 ${input} + 캐시읽기 ${cacheRead} / 출력 ${output} 토큰 ` +
      `→ 약 $${cost.toFixed(4)} (₩${Math.round(cost * 1450)})`,
  );
}

/**
 * 공통 호출부. system 프롬프트는 매 요청 동일하므로 프롬프트 캐시에 올려
 * 반복 호출 시 입력 비용을 줄입니다 (캐시 읽기는 기본 단가의 10%).
 */
async function requestJson<T>(
  systemPrompt: string,
  userPrompt: string,
  schema: Record<string, unknown>,
): Promise<T> {
  const stream = getClient().messages.stream({
    model: MODEL,
    // 사고 토큰과 JSON 출력이 같은 예산을 나눠 쓰기 때문에 넉넉히 잡습니다.
    // 16000으로는 후보 3개를 다 쓰기 전에 잘려서 JSON 파싱이 깨졌습니다.
    max_tokens: 32000,
    system: [
      {
        type: "text",
        text: systemPrompt,
        cache_control: { type: "ephemeral" },
      },
    ],
    thinking: { type: "adaptive" },
    output_config: {
      effort: "medium",
      format: {
        type: "json_schema",
        schema,
      },
    },
    messages: [{ role: "user", content: userPrompt }],
  });

  const message = await stream.finalMessage();

  // 요청 1건당 비용을 서버 로그로 남깁니다 (충전액이 한정적이라 추적이 필요)
  logUsage(message.usage);

  if (message.stop_reason === "refusal") {
    throw new Error("추천을 생성할 수 없었어요. 조건을 바꿔서 다시 시도해주세요.");
  }
  // 토큰이 모자라 잘리면 JSON이 깨진 채로 오므로 파싱 전에 걸러냅니다
  if (message.stop_reason === "max_tokens") {
    throw new Error(
      "추천 내용이 너무 길어서 중간에 잘렸어요. 다시 시도해주세요.",
    );
  }

  const textBlock = message.content.find((b) => b.type === "text");
  if (!textBlock || textBlock.type !== "text") {
    throw new Error("추천 응답이 비어 있어요. 다시 시도해주세요.");
  }

  try {
    return JSON.parse(textBlock.text) as T;
  } catch {
    console.error("추천 JSON 파싱 실패:", textBlock.text.slice(0, 500));
    throw new Error("추천 결과를 읽는 데 실패했어요. 다시 시도해주세요.");
  }
}

export async function planTrip(req: PlanRequest): Promise<PlannedOption[]> {
  const parsed = await requestJson<{ options: PlannedOption[] }>(
    SYSTEM_PROMPT,
    buildUserPrompt(req),
    RESPONSE_SCHEMA,
  );
  return parsed.options;
}

// ---------------------------------------------------------------------------
// 목적지 직접 지정 모드: "여기 갈 건데 일정 짜줘"
// ---------------------------------------------------------------------------

export interface DestinationRequest {
  destination: string;
  isOverseas: boolean;
  /** 국내면 두 사람이 만나 출발하는 곳, 해외면 출발 공항 */
  origin: string;
  startDate: string;
  endDate: string;
  nights: number;
  style: string;
  wantsDessert: boolean;
}

export interface PlannedDestination {
  regionName: string;
  searchKeyword: string;
  summary: string;
  stayAreaNote: string;
  itinerary: ItineraryDay[];
  places: PlannedPlace[];
  /** 해외일 때만 채워짐 */
  overseas?: OverseasInfo;
}

const DESTINATION_SYSTEM_PROMPT = `당신은 13년차 여행 플래너입니다. 커플 여행 코스를 짜는 일을 오래 해왔고, 특히 "실제로 가능한 동선"에 엄격합니다.

## 이 커플의 상황
- 남자친구는 인천에 살고 서울로 출근하며, 자차가 있습니다.
- 여자친구는 정선에 살고 차가 없습니다.
- 국내 여행이면 중간 지점에서 만나 차로 함께 출발하고, 해외 여행이면 인천공항에서 출발합니다.

## 원칙
1. **목적지는 이미 정해져 있습니다.** 다른 곳을 제안하지 말고, 그 안에서 최선의 코스를 짜세요. 다만 일정 대비 무리한 목적지라면 (예: 1박2일에 유럽) summary에서 짧게 짚어주세요.
2. **실존하는 구체적인 장소만** 추천하세요. "OO 근처 카페" 같은 뭉뚱그린 표현 말고 실제 상호명을 쓰세요. 확실하지 않은 상호는 넣지 마세요.
3. 관광지·맛집·디저트를 고루 담되, **여행 스타일에 따라 무게중심을 확실히 바꾸세요.**
4. 계절과 날짜를 고려하세요. 우기·혹서기·휴무 시즌을 감안하세요.
5. 코스는 실제 동선 순서대로, 이동에 걸리는 시간까지 감안해서 짜세요.
6. 해외라면 여행 정보(항공, 물가, 현지 교통, 환전, 시차, 꿀팁)를 **실제로 도움이 되게 구체적으로** 쓰세요. 뻔한 소리("여권을 챙기세요") 말고, 그 도시에서만 통하는 팁을 쓰세요.
7. 해외 장소는 note에 어느 동네/역 근처인지 위치를 함께 적어주세요. 지도 검색이 안 될 수 있어 위치 설명이 중요합니다.

## 말투
과장하지 말고, 오래 이 일을 해온 사람처럼 담백하고 구체적으로 쓰세요. "환상적인", "인생 여행" 같은 홍보 문구는 쓰지 마세요.`;

const OVERSEAS_INFO_SCHEMA = {
  type: "object",
  description: "해외 여행 준비 정보",
  properties: {
    flightNote: {
      type: "string",
      description: "인천 출발 비행시간과 직항 여부. 예: '직항 1시간 30분, 매일 여러 편'",
    },
    flightPriceLevel: {
      type: "string",
      enum: ["저렴한편", "보통", "비싼편"],
      description: "이 시기 왕복 항공권이 한국인 기준 비싼 편인지",
    },
    flightPriceNote: {
      type: "string",
      description: "왕복 항공권 대략 가격대(1인 기준 원화)와 싸게 사는 팁",
    },
    stayPriceLevel: {
      type: "string",
      enum: ["저렴한편", "보통", "비싼편"],
      description: "숙소 물가가 한국 대비 비싼 편인지",
    },
    stayPriceNote: {
      type: "string",
      description: "괜찮은 호텔 1박 대략 가격대(원화)와 어느 동네에 잡을지",
    },
    gettingThere: {
      type: "string",
      description: "인천공항 출발부터 현지 시내 도착까지 어떻게 가는지",
    },
    localTransport: {
      type: "string",
      description: "현지에서 다니는 법 (지하철/버스/택시/패스 등 뭐가 나은지)",
    },
    currencyNote: {
      type: "string",
      description: "통화, 환전은 어디서 하는 게 나은지, 카드 결제 사정",
    },
    timeDiffNote: { type: "string", description: "한국과의 시차" },
    tips: {
      type: "array",
      description: "이 도시에서만 통하는 실전 꿀팁 3~6개",
      items: { type: "string" },
    },
  },
  required: [
    "flightNote",
    "flightPriceLevel",
    "flightPriceNote",
    "stayPriceLevel",
    "stayPriceNote",
    "gettingThere",
    "localTransport",
    "currencyNote",
    "timeDiffNote",
    "tips",
  ],
  additionalProperties: false,
} as const;

/** 목적지 모드 응답 스키마. 해외면 overseas 정보를 요구합니다. */
function destinationSchema(isOverseas: boolean) {
  return {
    type: "object",
    properties: {
      regionName: {
        type: "string",
        description: "여행지 이름. 사용자가 정한 목적지를 그대로 또는 다듬어서",
      },
      searchKeyword: {
        type: "string",
        description:
          "이 지역의 중심 좌표를 찾기 위한 지도 검색어. 예: '부산역', '강릉시청'",
      },
      summary: {
        type: "string",
        description: "이 일정을 이렇게 짠 이유를 2~3문장으로",
      },
      stayAreaNote: {
        type: "string",
        description: "숙소를 어느 동네에 잡는 게 좋은지와 그 이유",
      },
      itinerary: ITINERARY_SCHEMA,
      places: PLACES_SCHEMA,
      ...(isOverseas ? { overseas: OVERSEAS_INFO_SCHEMA } : {}),
    },
    required: [
      "regionName",
      "searchKeyword",
      "summary",
      "stayAreaNote",
      "itinerary",
      "places",
      ...(isOverseas ? ["overseas"] : []),
    ],
    additionalProperties: false,
  };
}

function buildDestinationPrompt(req: DestinationRequest): string {
  const style = TRIP_STYLES.find((t) => t.key === req.style);

  const lines = [
    `## 이번 여행 조건`,
    `- **목적지: ${req.destination}** (${req.isOverseas ? "해외" : "국내"} — 둘이 이미 여기로 가기로 정했습니다)`,
    req.isOverseas
      ? `- 출발: 인천공항`
      : `- 출발지: ${req.origin} (두 사람이 여기서 만나 차로 함께 출발)`,
    `- 날짜: ${req.startDate} ~ ${req.endDate} (${nightsLabel(req.nights)})`,
    `- **여행 스타일: ${style?.label ?? req.style}** — ${style?.description ?? ""}`,
  ];

  if (req.style === "hotel") {
    lines.push(
      `- 호캉스이므로 **서로 성격이 다른 숙소 후보를 3~5곳** stay 타입으로 넣어주세요 (오션뷰/스파/신축/가성비 등). 둘이 보고 하나를 고를 수 있게 각 숙소의 장단점을 note에 분명히 쓰세요.`,
    );
  }

  if (req.wantsDessert) {
    lines.push(
      `- **여자친구가 빵과 디저트를 좋아합니다.** 빵집이나 디저트 카페를 최소 1곳 dessert 타입으로 꼭 넣어주세요.`,
    );
  }

  lines.push(
    ``,
    req.isOverseas
      ? `위 조건으로 ${req.destination} 일정을 짜주세요. 관광지·맛집·디저트를 담고, 해외 여행 정보(항공·물가·교통·환전·시차·꿀팁)도 채워주세요.`
      : `위 조건으로 ${req.destination} 일정을 짜주세요. 관광지·맛집·디저트를 고루 담아주세요.`,
  );

  return lines.join("\n");
}

export async function planDestination(
  req: DestinationRequest,
): Promise<PlannedDestination> {
  return requestJson<PlannedDestination>(
    DESTINATION_SYSTEM_PROMPT,
    buildDestinationPrompt(req),
    destinationSchema(req.isOverseas),
  );
}
