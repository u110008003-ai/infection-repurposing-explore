"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/auth-provider";
import { getSupabaseBrowserClient } from "@/lib/auth-client";
import { getApiErrorMessage } from "@/lib/api-error";
import { roleMeetsRequirement } from "@/lib/roles";
import type { CaseRecord, CaseUpdatePayload } from "@/lib/types";

type CaseEditFormProps = {
  caseItem: CaseRecord;
};

type FieldKey = keyof CaseUpdatePayload;

const fieldLabel: Record<FieldKey, string> = {
  question: "核心問題",
  narrative_timeline: "事件來龍去脈",
  stable_conclusion: "目前暫定結論",
  confirmed_facts: "已確認事實",
  possible_explanations: "目前可能解釋",
  unsupported_claims: "未支持主張",
  evidence_list: "證據與材料",
  reference_links: "參考連結",
  open_questions: "待確認問題",
  summary_image_url: "總整理圖網址",
  summary_image_note: "總整理圖說明",
};

const transferPresets: Array<{ source: FieldKey; target: FieldKey }> = [
  { source: "evidence_list", target: "stable_conclusion" },
  { source: "confirmed_facts", target: "stable_conclusion" },
  { source: "possible_explanations", target: "stable_conclusion" },
  { source: "open_questions", target: "unsupported_claims" },
  { source: "narrative_timeline", target: "stable_conclusion" },
];

export function CaseEditForm({ caseItem }: CaseEditFormProps) {
  const router = useRouter();
  const supabase = useMemo(() => getSupabaseBrowserClient(), []);
  const { session, profile } = useAuth();
  const [form, setForm] = useState<CaseUpdatePayload>({
    question: caseItem.question,
    narrative_timeline: caseItem.narrative_timeline,
    stable_conclusion: caseItem.stable_conclusion,
    confirmed_facts: caseItem.confirmed_facts,
    possible_explanations: caseItem.possible_explanations,
    unsupported_claims: caseItem.unsupported_claims,
    evidence_list: caseItem.evidence_list,
    reference_links: caseItem.reference_links,
    open_questions: caseItem.open_questions,
    summary_image_url: caseItem.summary_image_url,
    summary_image_note: caseItem.summary_image_note,
  });
  const [feedback, setFeedback] = useState<string | null>(null);
  const [isSaving, startSaveTransition] = useTransition();
  const [isDeleting, startDeleteTransition] = useTransition();
  const [isUploadingImage, startUploadTransition] = useTransition();
  const canEditCase = Boolean(profile?.role && roleMeetsRequirement(profile.role, "level_4"));
  const canDeleteCase = Boolean(profile?.role && roleMeetsRequirement(profile.role, "level_4"));

  function updateField<K extends FieldKey>(field: K, value: CaseUpdatePayload[K]) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  function transferField(source: FieldKey, target: FieldKey) {
    const sourceContent = form[source].trim();

    if (!sourceContent) {
      setFeedback(`目前「${fieldLabel[source]}」是空的，還沒有可轉移的內容。`);
      return;
    }

    if (source === target) {
      setFeedback("來源欄位和目標欄位不能是同一個。");
      return;
    }

    setForm((current) => {
      const targetContent = current[target].trim();
      const sourceBlock = `[轉入自 ${fieldLabel[source]}]\n${sourceContent}`;

      return {
        ...current,
        [target]: targetContent ? `${targetContent}\n\n${sourceBlock}` : sourceBlock,
      };
    });

    setFeedback(`已把「${fieldLabel[source]}」的內容附加到「${fieldLabel[target]}」。`);
  }

  function handleImageUpload(file: File | null) {
    setFeedback(null);

    if (!file) {
      return;
    }

    if (!session?.user || !canEditCase) {
      setFeedback("只有 Level 4 隱藏管理員可以上傳或替換案件總整理圖。");
      return;
    }

    if (!supabase) {
      setFeedback("目前沒有 Supabase 連線，無法上傳圖片。");
      return;
    }

    startUploadTransition(async () => {
      const extension = file.name.includes(".") ? file.name.split(".").pop() ?? "png" : "png";
      const safeExtension = extension.toLowerCase().replace(/[^a-z0-9]/g, "") || "png";
      const filePath = `cases/${caseItem.id}/${Date.now()}-${Math.random()
        .toString(36)
        .slice(2)}.${safeExtension}`;

      const storageBucket = "case-assets";
      const storage = supabase.storage.from(storageBucket);
      const uploadResult = await storage.upload(filePath, file, {
        cacheControl: "3600",
        upsert: false,
      });

      if (uploadResult.error) {
        setFeedback(
          `圖片上傳失敗：${uploadResult.error.message}。請先建立 Storage bucket 與 policy。`,
        );
        return;
      }

      const publicUrl = storage.getPublicUrl(filePath).data.publicUrl;

      setForm((current) => ({
        ...current,
        summary_image_url: publicUrl,
      }));
      setFeedback("圖片已上傳，總整理圖網址已自動填入。記得再按一次「儲存案件」。");
    });
  }

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFeedback(null);

    if (!session?.access_token) {
      setFeedback("請先登入後再儲存案件內容。");
      return;
    }

    if (!canEditCase) {
      setFeedback("只有 Level 4 隱藏管理員可以編輯正式案件。");
      return;
    }

    startSaveTransition(async () => {
      const response = await fetch(`/api/cases/${caseItem.id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify(form),
      });

      const data = (await response.json()) as { code?: string; error?: string; message?: string };

      if (!response.ok) {
        setFeedback(getApiErrorMessage(data, response.status));
        return;
      }

      setFeedback(data.message ?? "案件已儲存。");
      router.refresh();
    });
  }

  function handleDeleteCase() {
    setFeedback(null);

    if (!session?.access_token) {
      setFeedback("請先登入後再刪除案件。");
      return;
    }

    if (!canDeleteCase) {
      setFeedback("只有 Level 4 隱藏管理員可以刪除案件。");
      return;
    }

    const confirmed = window.confirm(
      `你確定要刪除「${caseItem.title}」嗎？\n刪除後資料無法復原。`,
    );

    if (!confirmed) {
      return;
    }

    startDeleteTransition(async () => {
      const response = await fetch(`/api/cases/${caseItem.id}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      const data = (await response.json()) as { code?: string; error?: string; message?: string };

      if (!response.ok) {
        setFeedback(getApiErrorMessage(data, response.status));
        return;
      }

      router.push("/");
      router.refresh();
    });
  }

  return (
    <form onSubmit={handleSubmit} className="grid gap-5">
      <section className="rounded-[1.25rem] border border-stone-200 bg-stone-50 p-4">
        <p className="text-sm font-semibold uppercase tracking-[0.2em] text-stone-500">
          內容搬運
        </p>
        <p className="mt-2 text-sm leading-7 text-stone-700">
          如果某個欄位已經整理得差不多，可以先搬到另一個欄位，再做後續精修。
        </p>
        <div className="mt-3 flex flex-wrap gap-2">
          {transferPresets.map((preset) => (
            <button
              key={`${preset.source}-${preset.target}`}
              type="button"
              disabled={!canEditCase || isSaving || isDeleting || isUploadingImage}
              onClick={() => transferField(preset.source, preset.target)}
              className="rounded-full border border-stone-300 px-3 py-2 text-xs font-semibold text-stone-700 transition hover:border-stone-500 hover:bg-white disabled:cursor-not-allowed disabled:border-stone-200 disabled:text-stone-400"
            >
              {fieldLabel[preset.source]} {"->"} {fieldLabel[preset.target]}
            </button>
          ))}
        </div>
      </section>

      <Field
        label={fieldLabel.question}
        hint="先用一句到一段話講清楚：這個案件到底要回答什麼問題。"
        value={form.question}
        onChange={(value) => updateField("question", value)}
        minHeight="min-h-28"
        disabled={!canEditCase}
      />

      <Field
        label={fieldLabel.narrative_timeline}
        hint="建議一行寫一個時間點、人物行動或重要轉折。"
        value={form.narrative_timeline}
        onChange={(value) => updateField("narrative_timeline", value)}
        minHeight="min-h-40"
        disabled={!canEditCase}
      />

      <Field
        label={fieldLabel.stable_conclusion}
        value={form.stable_conclusion}
        onChange={(value) => updateField("stable_conclusion", value)}
        minHeight="min-h-28"
        disabled={!canEditCase}
      />

      <Field
        label={fieldLabel.confirmed_facts}
        value={form.confirmed_facts}
        onChange={(value) => updateField("confirmed_facts", value)}
        disabled={!canEditCase}
      />

      <Field
        label={fieldLabel.possible_explanations}
        hint="把目前這個現象可能有哪些解釋先列出來，和已確認事實分開。"
        value={form.possible_explanations}
        onChange={(value) => updateField("possible_explanations", value)}
        disabled={!canEditCase}
      />

      <Field
        label={fieldLabel.unsupported_claims}
        value={form.unsupported_claims}
        onChange={(value) => updateField("unsupported_claims", value)}
        disabled={!canEditCase}
      />

      <Field
        label={fieldLabel.evidence_list}
        value={form.evidence_list}
        onChange={(value) => updateField("evidence_list", value)}
        disabled={!canEditCase}
      />

      <Field
        label={fieldLabel.reference_links}
        hint="一行放一個連結，網址可以是文章、貼文、文件、資料來源。"
        value={form.reference_links}
        onChange={(value) => updateField("reference_links", value)}
        disabled={!canEditCase}
      />

      <Field
        label={fieldLabel.open_questions}
        value={form.open_questions}
        onChange={(value) => updateField("open_questions", value)}
        disabled={!canEditCase}
      />

      <section className="grid gap-3 rounded-[1.25rem] border border-stone-200 bg-stone-50 p-4">
        <div>
          <h3 className="text-sm font-semibold text-stone-900">總整理圖</h3>
          <p className="mt-1 text-xs leading-6 text-stone-500">
            你現在可以直接選圖片上傳。上傳成功後會自動填入網址，然後再按一次「儲存案件」即可。
          </p>
        </div>

        <label className="grid gap-2">
          <span className="text-sm font-medium text-stone-700">直接上傳圖片</span>
          <input
            type="file"
            accept="image/*"
            disabled={!canEditCase || isUploadingImage || isSaving || isDeleting}
            onChange={(event) => {
              const file = event.target.files?.[0] ?? null;
              handleImageUpload(file);
              event.currentTarget.value = "";
            }}
            className="rounded-[1rem] border border-stone-300 bg-white px-4 py-3 text-sm text-stone-700 file:mr-3 file:rounded-full file:border-0 file:bg-stone-950 file:px-3 file:py-2 file:text-sm file:font-semibold file:text-white"
          />
        </label>

        {isUploadingImage ? (
          <div className="rounded-[1rem] border border-stone-200 bg-white px-4 py-3 text-sm leading-7 text-stone-700">
            圖片上傳中...
          </div>
        ) : null}

        <Field
          label={fieldLabel.summary_image_url}
          hint="如果你已經有現成圖片網址，也可以直接貼這裡。"
          value={form.summary_image_url}
          onChange={(value) => updateField("summary_image_url", value)}
          minHeight="min-h-0"
          disabled={!canEditCase}
        />
      </section>

      <Field
        label={fieldLabel.summary_image_note}
        hint="可以補充圖的來源、閱讀方式或一句總結。"
        value={form.summary_image_note}
        onChange={(value) => updateField("summary_image_note", value)}
        minHeight="min-h-24"
        disabled={!canEditCase}
      />

      <div className="flex flex-wrap items-center justify-end gap-3">
        {canDeleteCase ? (
          <button
            type="button"
            onClick={handleDeleteCase}
            disabled={isSaving || isDeleting || isUploadingImage}
            className="inline-flex items-center justify-center rounded-full border border-rose-300 px-5 py-3 text-sm font-semibold text-rose-700 transition hover:bg-rose-50 disabled:cursor-not-allowed disabled:border-stone-300 disabled:text-stone-400"
          >
            {isDeleting ? "刪除中..." : "刪除案件"}
          </button>
        ) : null}

        <button
          type="submit"
          disabled={!canEditCase || isSaving || isDeleting || isUploadingImage}
          className="inline-flex items-center justify-center rounded-full bg-stone-950 px-5 py-3 text-sm font-semibold text-white transition hover:bg-stone-800 disabled:cursor-not-allowed disabled:bg-stone-400"
        >
          {isSaving ? "儲存中..." : "儲存案件"}
        </button>
      </div>

      {feedback ? (
        <div className="rounded-[1.25rem] border border-stone-200 bg-stone-50 px-4 py-3 text-sm leading-7 text-stone-700">
          {feedback}
        </div>
      ) : null}
    </form>
  );
}

function Field({
  label,
  hint,
  value,
  onChange,
  minHeight = "min-h-40",
  disabled = false,
}: {
  label: string;
  hint?: string;
  value: string;
  onChange: (value: string) => void;
  minHeight?: string;
  disabled?: boolean;
}) {
  return (
    <label className="grid gap-2">
      <span className="text-sm font-medium text-stone-700">{label}</span>
      {hint ? <span className="text-xs leading-6 text-stone-500">{hint}</span> : null}
      <textarea
        value={value}
        disabled={disabled}
        onChange={(event) => onChange(event.target.value)}
        className={`rounded-[1.25rem] border border-stone-300 bg-white px-4 py-3 text-base leading-7 text-stone-900 outline-none transition placeholder:text-stone-400 focus:border-stone-950 disabled:cursor-not-allowed disabled:bg-stone-100 disabled:text-stone-500 ${minHeight}`}
      />
    </label>
  );
}
