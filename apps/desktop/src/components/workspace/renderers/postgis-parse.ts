/**
 * Shared PostGIS parsing helpers. Split out so that both the cell renderer and
 * the map editor can agree on what a Point / Unknown / Invalid value looks
 * like. Keeping this in its own module (no React imports) also keeps it cheap
 * to pull into unit tests.
 */

export type ParsedPoint = {
  type: "Point";
  coordinates: { x: number; y: number };
  srid: number | undefined;
};

export type ParsedGeometry =
  | ParsedPoint
  | { type: "Unknown"; srid: number | undefined }
  | { type: "Invalid" };

function hexToDataView(hex: string): DataView {
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0, j = 0; i < bytes.length; i++, j += 2) {
    bytes[i] = Number.parseInt(hex.slice(j, j + 2), 16);
  }
  return new DataView(bytes.buffer);
}

export function parseEWKBHex(hex: string): ParsedGeometry {
  try {
    const view = hexToDataView(hex);
    const littleEndian = view.getUint8(0) === 1;
    let offset = 1;
    const type = view.getUint32(offset, littleEndian);
    offset += 4;
    const hasSRID = (type & 0x20000000) !== 0;
    const geomType = type & 0xff;
    let srid: number | undefined;
    if (hasSRID) {
      srid = view.getUint32(offset, littleEndian);
      offset += 4;
    }
    if (geomType === 1) {
      const x = view.getFloat64(offset, littleEndian);
      const y = view.getFloat64(offset + 8, littleEndian);
      return { type: "Point", coordinates: { x, y }, srid };
    }
    return { type: "Unknown", srid };
  } catch {
    return { type: "Invalid" };
  }
}

/**
 * Accepts either an EWKB hex blob or a WKT/EWKT string like
 * `SRID=4326;POINT(-122.4 37.7)`. Returns `null` for non-Point inputs so the
 * caller can decide whether to fall through to the WKT textarea.
 */
export function extractPoint(
  value: unknown,
): { lat: number; lng: number; srid: number } | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  if (/^[0-9a-f]+$/i.test(trimmed)) {
    const geom = parseEWKBHex(trimmed);
    if (geom.type === "Point") {
      return {
        lat: geom.coordinates.y,
        lng: geom.coordinates.x,
        srid: geom.srid ?? 4326,
      };
    }
    return null;
  }
  const match =
    /^(?:SRID=(-?\d+)\s*;)?\s*POINT\s*\(\s*(-?\d+(?:\.\d+)?)\s+(-?\d+(?:\.\d+)?)\s*\)\s*$/i.exec(
      trimmed,
    );
  if (match) {
    const sridRaw = match[1];
    const lngRaw = match[2];
    const latRaw = match[3];
    if (lngRaw === undefined || latRaw === undefined) return null;
    const srid = sridRaw ? Number.parseInt(sridRaw, 10) : 4326;
    const lng = Number.parseFloat(lngRaw);
    const lat = Number.parseFloat(latRaw);
    return { lat, lng, srid };
  }
  return null;
}

export function pointToEWKT(p: {
  lat: number;
  lng: number;
  srid: number;
}): string {
  return `SRID=${p.srid};POINT(${p.lng} ${p.lat})`;
}
