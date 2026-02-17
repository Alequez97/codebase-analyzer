const ISO_UTC_TIMESTAMP_REGEX =
  /\b(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2})(?:\.\d+)?Z\b/g;

/**
 * Replace ISO UTC timestamps in text with DD.MM.YYYY HH:mm:ss.
 * Presentation-only helper; does not mutate stored log data.
 * @param {string} text
 * @returns {string}
 */
export function formatIsoUtcTimestampsInText(text) {
  if (typeof text !== "string" || text.length === 0) {
    return text || "";
  }

  return text.replace(
    ISO_UTC_TIMESTAMP_REGEX,
    (_full, year, month, day, hours, minutes, seconds) =>
      `${day}.${month}.${year} ${hours}:${minutes}:${seconds}`,
  );
}
