export function normalizeJSONObject(data) {
  try {
    return JSON.parse(JSON.stringify(data))
  } catch {
    return {}
  }
}
