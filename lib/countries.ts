/**
 * Sign-up saves a country's full name, while flags and the leaderboard filter
 * need its two-letter code. Treating the name as a code gave garbage flags and
 * a filter that matched nobody. Copied in the app at src/lib/format.ts.
 */
const COUNTRY_CODES: Record<string, string> = {
  Afghanistan: "AF",
  Argentina: "AR",
  Australia: "AU",
  Bangladesh: "BD",
  Brazil: "BR",
  Canada: "CA",
  Chile: "CL",
  China: "CN",
  Colombia: "CO",
  "Czech Republic": "CZ",
  Denmark: "DK",
  Egypt: "EG",
  Ethiopia: "ET",
  Finland: "FI",
  France: "FR",
  Germany: "DE",
  Ghana: "GH",
  India: "IN",
  Indonesia: "ID",
  Iran: "IR",
  Iraq: "IQ",
  Israel: "IL",
  Italy: "IT",
  Japan: "JP",
  Jordan: "JO",
  Kenya: "KE",
  Lebanon: "LB",
  Malaysia: "MY",
  Mexico: "MX",
  Morocco: "MA",
  Nepal: "NP",
  Netherlands: "NL",
  "New Zealand": "NZ",
  Nigeria: "NG",
  Norway: "NO",
  Pakistan: "PK",
  Peru: "PE",
  Philippines: "PH",
  Poland: "PL",
  Romania: "RO",
  Russia: "RU",
  "Saudi Arabia": "SA",
  Singapore: "SG",
  "South Africa": "ZA",
  "South Korea": "KR",
  Spain: "ES",
  "Sri Lanka": "LK",
  Sweden: "SE",
  Tanzania: "TZ",
  Thailand: "TH",
  Turkey: "TR",
  UAE: "AE",
  Uganda: "UG",
  Ukraine: "UA",
  "United Kingdom": "GB",
  "United States": "US",
  Venezuela: "VE",
  Vietnam: "VN",
  Zimbabwe: "ZW",
};

/** Flag emoji for a stored country (name or code); empty when there isn't one, e.g. "Other". */
export function countryFlag(country: string): string {
  const code = /^[A-Za-z]{2}$/.test(country) ? country.toUpperCase() : COUNTRY_CODES[country];
  if (!code) return "";
  return code
    .split("")
    .map((c) => String.fromCodePoint(0x1f1e6 + c.charCodeAt(0) - 65))
    .join("");
}

/** Every stored spelling of a country filter value: older rows may hold the code. */
export function countryValues(filter: string): string[] {
  const code = filter.toUpperCase();
  const name = Object.keys(COUNTRY_CODES).find((n) => COUNTRY_CODES[n] === code);
  return name ? [code, name] : [filter];
}
