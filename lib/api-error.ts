export type ApiErrorPayload = {
  code?: string;
  error?: string;
  message?: string;
};

export function getApiErrorMessage(payload: ApiErrorPayload, status?: number) {
  if (payload.code === "auth_token_missing") {
    return "請先登入後再操作。";
  }

  if (payload.code === "auth_token_invalid") {
    return "登入已過期，請重新登入。";
  }

  if (payload.code === "profile_not_found") {
    return "找不到你的身份資料，請重新登入後再試。";
  }

  if (payload.code === "insufficient_role") {
    return "你的權限不足，無法執行這個動作。";
  }

  if (status === 401) {
    return "請先登入後再操作。";
  }

  if (status === 403) {
    return "權限不足，無法執行這個操作。";
  }

  return payload.error ?? "操作失敗，請稍後再試。";
}
