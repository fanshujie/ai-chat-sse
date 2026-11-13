export interface ComplianceResult {
  合规结论: string
  依据: string
  风险提示: string
}

export type ValidateResult =
  | { ok: true; data: ComplianceResult }
  | { ok: false; reason: string }

/** 只负责「解析 + 字段校验」，不负责请求模型 */
export function validateComplianceJson(raw: string): ValidateResult {
  let obj: unknown
  try {
    // 兼容模型偶尔仍用 ```json 包住的情况
    obj = JSON.parse(raw.trim().replace(/^```json\s*|\s*```$/g, ''))
  } catch {
    return { ok: false, reason: '不是合法 JSON' }
  }
  if (typeof obj !== 'object' || obj === null || Array.isArray(obj)) {
    return { ok: false, reason: '顶层不是对象' }
  }
  const o = obj as Record<string, unknown>
  const required = ['合规结论', '依据', '风险提示'] as const
  for (const k of required) {
    if (typeof o[k] !== 'string' || !(o[k] as string).trim()) {
      return { ok: false, reason: `字段缺失或非字符串：${k}` }
    }
  }
  return { ok: true, data: o as unknown as ComplianceResult }
}
