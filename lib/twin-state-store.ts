import "server-only";

import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { getSupabaseServerClient } from "@/lib/supabase";
import type { TwinStateObservation, TwinStateSnapshot, TwinStateTimeline } from "@/lib/infection-explorer";

type PersistedRecord = {
  case_id: string;
  observations: TwinStateObservation[];
  history: TwinStateSnapshot[];
};

type LocalStoreShape = {
  timelines: Record<string, PersistedRecord>;
};

const localStoreDir = path.join(process.cwd(), ".data");
const localStorePath = path.join(localStoreDir, "twin-state-store.json");

function ensureLocalStore() {
  if (!existsSync(localStoreDir)) {
    mkdirSync(localStoreDir, { recursive: true });
  }

  if (!existsSync(localStorePath)) {
    writeFileSync(localStorePath, JSON.stringify({ timelines: {} } satisfies LocalStoreShape, null, 2), "utf8");
  }
}

function readLocalStore(): LocalStoreShape {
  ensureLocalStore();
  return JSON.parse(readFileSync(localStorePath, "utf8")) as LocalStoreShape;
}

function writeLocalStore(store: LocalStoreShape) {
  ensureLocalStore();
  writeFileSync(localStorePath, JSON.stringify(store, null, 2), "utf8");
}

async function getSupabaseTimeline(caseId: string): Promise<TwinStateTimeline | null> {
  const supabase = getSupabaseServerClient();

  if (!supabase) {
    return null;
  }

  const { data, error } = await supabase
    .from("twin_state_timelines")
    .select("case_id, observations, history")
    .eq("case_id", caseId)
    .maybeSingle();

  if (error || !data) {
    return null;
  }

  const row = data as {
    case_id: string;
    observations?: TwinStateObservation[];
    history?: TwinStateSnapshot[];
  };
  const history = row.history ?? [];

  if (history.length === 0) {
    return null;
  }

  return {
    case_id: row.case_id,
    latest_snapshot: history[history.length - 1],
    history,
  };
}

async function saveSupabaseTimeline(timeline: TwinStateTimeline, observations: TwinStateObservation[]) {
  const supabase = getSupabaseServerClient();

  if (!supabase) {
    return false;
  }

  const twinStateTable = supabase.from("twin_state_timelines") as unknown as {
    upsert: (value: {
      case_id: string;
      observations: TwinStateObservation[];
      history: TwinStateSnapshot[];
      updated_at: string;
    }) => PromiseLike<{ error: { message: string } | null }>;
  };

  const { error } = await twinStateTable.upsert({
    case_id: timeline.case_id,
    observations,
    history: timeline.history,
    updated_at: new Date().toISOString(),
  });

  return !error;
}

export async function getTwinStateTimeline(caseId: string): Promise<TwinStateTimeline | null> {
  const supabaseTimeline = await getSupabaseTimeline(caseId);

  if (supabaseTimeline) {
    return supabaseTimeline;
  }

  const store = readLocalStore();
  const record = store.timelines[caseId];

  if (!record || record.history.length === 0) {
    return null;
  }

  return {
    case_id: record.case_id,
    latest_snapshot: record.history[record.history.length - 1],
    history: record.history,
  };
}

export async function saveTwinStateTimeline(input: {
  caseId: string;
  snapshot: TwinStateSnapshot;
  observations: TwinStateObservation[];
}) {
  const existing = await getTwinStateTimeline(input.caseId);
  const nextTimeline: TwinStateTimeline = {
    case_id: input.caseId,
    latest_snapshot: input.snapshot,
    history: [...(existing?.history ?? []), input.snapshot],
  };

  const savedToSupabase = await saveSupabaseTimeline(nextTimeline, input.observations);

  if (!savedToSupabase) {
    const store = readLocalStore();
    store.timelines[input.caseId] = {
      case_id: input.caseId,
      observations: input.observations,
      history: nextTimeline.history,
    };
    writeLocalStore(store);
  }

  return nextTimeline;
}

export async function getTwinStateObservations(caseId: string): Promise<TwinStateObservation[]> {
  const supabase = getSupabaseServerClient();

  if (supabase) {
    const { data } = await supabase
      .from("twin_state_timelines")
      .select("observations")
      .eq("case_id", caseId)
      .maybeSingle();

    const row = data as { observations?: TwinStateObservation[] } | null;

    if (row?.observations) {
      return row.observations;
    }
  }

  const store = readLocalStore();
  return store.timelines[caseId]?.observations ?? [];
}
