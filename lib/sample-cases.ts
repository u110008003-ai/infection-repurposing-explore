import { CaseRecord } from "@/lib/types";

export const sampleCases: CaseRecord[] = [
  {
    id: "sample-case-1",
    title: "示範案件：某公共事件是否值得整理成正式討論案件",
    question: "這個事件目前流傳很多說法，但哪些資訊已經足夠支持公開討論，哪些還需要更多查證？",
    narrative_timeline: [
      "- 第一波討論從社群貼文開始，事件名稱與主要說法先被快速擴散。",
      "- 接著有人整理不同時間點的畫面、貼文與留言，開始出現多個版本的解讀。",
      "- 隨後有媒體或整理者提出比對資料，讓部分說法得到支持，但也讓新的疑點浮現。",
      "- 到目前為止，大家已經能描述事件大概經過，但對原因、責任與真實脈絡仍有分歧。",
    ].join("\n"),
    stable_conclusion:
      "目前可以先確認這是一個資訊仍在變動中的事件，適合把已知事實、可能解釋與待查疑點拆開整理，避免不同層級的訊息混在一起。",
    confirmed_facts: [
      "- 已經能確認事件確實發生，且有對應時間點與公開討論紀錄。",
      "- 目前可以找到多個彼此獨立的素材來源，而不是只有單一轉述。",
      "- 部分畫面或文字紀錄可以互相對照，足以支持最基本的事件輪廓。",
    ].join("\n"),
    possible_explanations: [
      "- 現象可能是單一事件被過度延伸解讀，後續討論把原始脈絡放大了。",
      "- 也可能是多個相似片段被拼接在一起，造成外界以為它們屬於同一條事件線。",
      "- 還有一種可能是原始資訊本身不完整，讓不同觀察者根據各自立場補上不同解釋。",
    ].join("\n"),
    unsupported_claims: [
      "- 某些高度確定的說法目前仍找不到直接來源支持。",
      "- 部分流傳版本只出現在二手轉述中，缺乏原始資料或清楚上下文。",
    ].join("\n"),
    evidence_list: [
      "- 原始貼文與轉發紀錄。",
      "- 能對照時間順序的截圖或畫面。",
      "- 後續整理者提出的比對資料與討論串。",
    ].join("\n"),
    reference_links: [
      "https://example.com/source-post",
      "https://example.com/timeline-thread",
    ].join("\n"),
    open_questions: [
      "- 最早的原始來源是誰？",
      "- 不同版本說法之間，哪些其實是在描述同一件事，哪些不是？",
      "- 是否還有缺少的關鍵素材能幫助排除某些解釋？",
    ].join("\n"),
    summary_image_url: "",
    summary_image_note: "之後可以放一張把時間線、人物與說法關係整理在一起的圖。",
    status: "draft",
    updated_at: new Date().toISOString(),
  },
];
