export const proposalDraftSections = [
  {
    key: "question",
    label: "核心問題",
    description: "先講清楚這個提案到底想回答什麼問題，避免後面全部混在一起。",
    tone: "neutral",
    promoteToCase: true,
  },
  {
    key: "narrative",
    label: "事件來龍去脈",
    description: "建議分段或分行寫出事件發展，讓後續能逐段拆開檢視。",
    tone: "neutral",
    promoteToCase: true,
  },
  {
    key: "conclusion",
    label: "目前暫定結論",
    description: "這是現階段依據手上資料得到的暫時結論，之後仍可修訂。",
    tone: "gold",
    promoteToCase: true,
  },
  {
    key: "facts",
    label: "已確認事實",
    description: "只放目前已有來源支持、可查證的內容。",
    tone: "success",
    promoteToCase: true,
  },
  {
    key: "possibleExplanations",
    label: "目前可能解釋",
    description: "把不同可能性分開寫，避免直接把推測混成事實。",
    tone: "info",
    promoteToCase: true,
  },
  {
    key: "claims",
    label: "待查或未支持主張",
    description: "放目前還缺證據、或需要再交叉比對的說法。",
    tone: "warning",
    promoteToCase: true,
  },
  {
    key: "evidence",
    label: "證據與材料",
    description: "整理你已經掌握的資料、摘錄、說明或線索。",
    tone: "neutral",
    promoteToCase: true,
  },
  {
    key: "referenceLinks",
    label: "參考連結",
    description: "一行一個連結，適合放原始貼文、報導、文件或公開資料。",
    tone: "neutral",
    promoteToCase: true,
  },
  {
    key: "openQuestions",
    label: "待確認問題",
    description: "列出這份提案還沒釐清、接下來要繼續查的問題。",
    tone: "neutral",
    promoteToCase: true,
  },
  {
    key: "imageNote",
    label: "總整理圖說明",
    description: "如果之後會做圖，先寫這張圖要整理什麼、怎麼看。",
    tone: "neutral",
    promoteToCase: true,
  },
  {
    key: "authorAside",
    label: "作者 OS / 心裡話",
    description: "這裡可以放作者的觀察、顧慮、卡住的地方或想提醒審稿者的話，不會進正式案件。",
    tone: "neutral",
    promoteToCase: false,
  },
] as const;

export type ProposalDraftSectionKey = (typeof proposalDraftSections)[number]["key"];
export type ProposalDraftTone = (typeof proposalDraftSections)[number]["tone"];

export type ProposalDraft = Record<ProposalDraftSectionKey, string>;

export const emptyProposalDraft: ProposalDraft = {
  question: "",
  narrative: "",
  conclusion: "",
  facts: "",
  possibleExplanations: "",
  claims: "",
  evidence: "",
  referenceLinks: "",
  openQuestions: "",
  imageNote: "",
  authorAside: "",
};

function marker(label: string) {
  return `## ${label}`;
}

export function serializeProposalDraft(draft: ProposalDraft) {
  return proposalDraftSections
    .map(({ key, label }) => `${marker(label)}\n${draft[key].trim()}`)
    .join("\n\n");
}

export function parseProposalDraft(content: string): ProposalDraft {
  const draft: ProposalDraft = { ...emptyProposalDraft };

  for (let index = 0; index < proposalDraftSections.length; index += 1) {
    const current = proposalDraftSections[index];
    const next = proposalDraftSections[index + 1];
    const startMarker = marker(current.label);
    const startIndex = content.indexOf(startMarker);

    if (startIndex < 0) {
      continue;
    }

    const contentStart = startIndex + startMarker.length;
    const endIndex = next ? content.indexOf(marker(next.label), contentStart) : content.length;
    const raw = content.slice(contentStart, endIndex >= 0 ? endIndex : content.length);
    draft[current.key] = raw.trim();
  }

  return draft;
}

export function isStructuredProposalContent(content: string) {
  return proposalDraftSections.some(({ label }) => content.includes(marker(label)));
}
