export type TimeZoneOption = {
  id: string;
  label: string;
};

export type TimeZoneGroup = {
  label: string;
  zones: TimeZoneOption[];
};

type FeaturedTimeZone = {
  id: string;
  name: string;
};

const FEATURED_TIME_ZONE_GROUPS: Array<{
  label: string;
  zones: FeaturedTimeZone[];
}> = [
  {
    label: "Brazil",
    zones: [
      { id: "America/Sao_Paulo", name: "São Paulo" },
      { id: "America/Manaus", name: "Manaus" },
      { id: "America/Rio_Branco", name: "Rio Branco" },
    ],
  },
  {
    label: "United States",
    zones: [
      { id: "America/New_York", name: "New York" },
      { id: "America/Chicago", name: "Chicago" },
      { id: "America/Denver", name: "Denver" },
      { id: "America/Phoenix", name: "Phoenix" },
      { id: "America/Los_Angeles", name: "Los Angeles" },
      { id: "America/Anchorage", name: "Anchorage" },
      { id: "Pacific/Honolulu", name: "Honolulu" },
    ],
  },
  {
    label: "Canada",
    zones: [
      { id: "America/Toronto", name: "Toronto" },
      { id: "America/Halifax", name: "Halifax" },
      { id: "America/St_Johns", name: "St. John's" },
      { id: "America/Winnipeg", name: "Winnipeg" },
      { id: "America/Edmonton", name: "Edmonton" },
      { id: "America/Vancouver", name: "Vancouver" },
    ],
  },
  {
    label: "Europe",
    zones: [
      { id: "Europe/Lisbon", name: "Lisbon" },
      { id: "Europe/London", name: "London" },
      { id: "Europe/Madrid", name: "Madrid" },
      { id: "Europe/Paris", name: "Paris" },
      { id: "Europe/Berlin", name: "Berlin" },
      { id: "Europe/Rome", name: "Rome" },
    ],
  },
  {
    label: "Russia",
    zones: [
      { id: "Europe/Kaliningrad", name: "Kaliningrad" },
      { id: "Europe/Moscow", name: "Moscow" },
      { id: "Europe/Samara", name: "Samara" },
      { id: "Asia/Yekaterinburg", name: "Yekaterinburg" },
      { id: "Asia/Omsk", name: "Omsk" },
      { id: "Asia/Krasnoyarsk", name: "Krasnoyarsk" },
      { id: "Asia/Irkutsk", name: "Irkutsk" },
      { id: "Asia/Yakutsk", name: "Yakutsk" },
      { id: "Asia/Vladivostok", name: "Vladivostok" },
      { id: "Asia/Kamchatka", name: "Kamchatka" },
    ],
  },
  {
    label: "Australia and Oceania",
    zones: [
      { id: "Australia/Perth", name: "Perth" },
      { id: "Australia/Darwin", name: "Darwin" },
      { id: "Australia/Adelaide", name: "Adelaide" },
      { id: "Australia/Brisbane", name: "Brisbane" },
      { id: "Australia/Sydney", name: "Sydney" },
      { id: "Australia/Melbourne", name: "Melbourne" },
      { id: "Pacific/Auckland", name: "Auckland" },
    ],
  },
  {
    label: "Latin America",
    zones: [
      { id: "America/Mexico_City", name: "Mexico City" },
      { id: "America/Bogota", name: "Bogota" },
      { id: "America/Lima", name: "Lima" },
      { id: "America/Santiago", name: "Santiago" },
      { id: "America/Argentina/Buenos_Aires", name: "Buenos Aires" },
    ],
  },
  {
    label: "Asia and Middle East",
    zones: [
      { id: "Asia/Dubai", name: "Dubai" },
      { id: "Asia/Kolkata", name: "India" },
      { id: "Asia/Bangkok", name: "Bangkok" },
      { id: "Asia/Singapore", name: "Singapore" },
      { id: "Asia/Shanghai", name: "Shanghai" },
      { id: "Asia/Tokyo", name: "Tokyo" },
      { id: "Asia/Seoul", name: "Seoul" },
    ],
  },
  {
    label: "Africa",
    zones: [
      { id: "Africa/Casablanca", name: "Casablanca" },
      { id: "Africa/Cairo", name: "Cairo" },
      { id: "Africa/Johannesburg", name: "Johannesburg" },
      { id: "Africa/Nairobi", name: "Nairobi" },
    ],
  },
];

const formatterCache = new Map<string, Intl.DateTimeFormat>();

function offsetLabel(timeZone: string, date = new Date()): string {
  let formatter = formatterCache.get(timeZone);
  if (!formatter) {
    formatter = new Intl.DateTimeFormat("en-US", {
      timeZone,
      timeZoneName: "shortOffset",
    });
    formatterCache.set(timeZone, formatter);
  }

  const offset =
    formatter.formatToParts(date).find((part) => part.type === "timeZoneName")?.value ?? "";
  return offset.replace("GMT", "UTC").replace("-", "−");
}

function safeOption(zone: FeaturedTimeZone): TimeZoneOption | null {
  try {
    return { id: zone.id, label: `${zone.name} (${offsetLabel(zone.id)})` };
  } catch {
    return null;
  }
}

function allSupportedTimeZones(): string[] {
  const supportedValuesOf = (
    Intl as typeof Intl & { supportedValuesOf?: (key: "timeZone") => string[] }
  ).supportedValuesOf;

  if (!supportedValuesOf) return [];
  return supportedValuesOf("timeZone");
}

function prettyZoneName(timeZone: string): string {
  const parts = timeZone.split("/");
  return parts.at(-1)?.replace(/_/g, " ") ?? timeZone;
}

export function buildTimeZoneGroups(): TimeZoneGroup[] {
  const used = new Set<string>();
  const featured = FEATURED_TIME_ZONE_GROUPS.map((group) => {
    const zones = group.zones.flatMap((zone) => {
      const option = safeOption(zone);
      if (!option) return [];
      used.add(option.id);
      return [option];
    });
    return { label: group.label, zones };
  }).filter((group) => group.zones.length > 0);

  const allZones = allSupportedTimeZones()
    .filter((zone) => !used.has(zone))
    .map((zone) => ({
      id: zone,
      label: `${prettyZoneName(zone)} - ${zone} (${offsetLabel(zone)})`,
    }));

  if (allZones.length > 0) {
    featured.push({
      label: "All IANA time zones supported by this browser",
      zones: allZones,
    });
  }

  return featured;
}
