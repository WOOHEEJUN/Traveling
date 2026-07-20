import Anthropic from "@anthropic-ai/sdk";
import { TRIP_STYLES, type ItineraryDay } from "./types";
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
          itinerary: {
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
          },
          places: {
            type: "array",
            description:
              "실존하는 구체적 장소들. 총 6~10곳. 개수 배분은 여행 스타일을 따르세요. " +
              "호캉스면 숙소를 자세히 쓰고 나머지는 적게, 관광위주면 놀거리를 많이, " +
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
          },
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

export async function planTrip(req: PlanRequest): Promise<PlannedOption[]> {
  const stream = getClient().messages.stream({
    model: "claude-opus-4-8",
    max_tokens: 16000,
    system: SYSTEM_PROMPT,
    thinking: { type: "adaptive" },
    output_config: {
      effort: "high",
      format: {
        type: "json_schema",
        schema: RESPONSE_SCHEMA,
      },
    },
    messages: [{ role: "user", content: buildUserPrompt(req) }],
  });

  const message = await stream.finalMessage();

  if (message.stop_reason === "refusal") {
    throw new Error("추천을 생성할 수 없었어요. 조건을 바꿔서 다시 시도해주세요.");
  }

  const textBlock = message.content.find((b) => b.type === "text");
  if (!textBlock || textBlock.type !== "text") {
    throw new Error("추천 응답이 비어 있어요. 다시 시도해주세요.");
  }

  const parsed = JSON.parse(textBlock.text) as { options: PlannedOption[] };
  return parsed.options;
}
