import { stringify } from "@/lib/utils";
import { typeRegistry, type TypeRenderer } from "./type-registry";

function buildMapUrl(lat: number, lon: number): string {
  return `https://www.openstreetmap.org/?mlat=${lat}&mlon=${lon}&zoom=15`;
}

function hexToDataView(hex: string) {
  const bytes = new Uint8Array(hex.length / 2);

for (let i = 0, j = 0; i < bytes.length; i++, j += 2) {
  bytes[i] = Number.parseInt(hex.slice(j, j + 2), 16);
}

  return new DataView(bytes.buffer);
}

type Point = {
  type: "Point";
  coordinates: {
    x: number;
    y: number;
  };
  srid: number | undefined;
};

type Geometry =
  | Point
  | { type: "Unknown"; srid: number | undefined }
  | { type: "Invalid" };

function parseEWKB(hex: string): Geometry {
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

      return {
        type: "Point",
        coordinates: { x, y },
        srid,
      };
    }

    return {
      type: "Unknown",
      srid,
    };
  } catch {
    return {
      type: "Invalid",
    };
  }
}

function toGeoJSON(geom: ReturnType<typeof parseEWKB>) {
  if (geom.type === "Point") {
    return {
      type: "Point",
      coordinates: geom.coordinates,
    };
  }
  return null;
}

function parseGeometry(value: unknown) {
  if (typeof value !== "string") return null;

  try {
    const geom = parseEWKB(value);
    return geom;
  } catch {
    return null;
  }
}

const geographyRenderer: TypeRenderer = {
  renderCell(value: unknown) {
    const geom = parseGeometry(value);

    if (!geom) {
      return <span className="font-mono text-xs">{stringify(value)}</span>;
    }

    if (geom.type === "Point") {
      const { x, y } = geom.coordinates;

      return (
        <span className="font-mono text-xs">
          POINT({y.toFixed(4)}, {x.toFixed(4)})
        </span>
      );
    }

    return (
      <span className="font-mono text-xs text-muted-foreground">
        {geom.type}
      </span>
    );
  },

  renderCard(value: unknown) {
    const geom = parseGeometry(value);

    if (!geom) {
      return (
        <pre className="font-mono text-xs whitespace-pre-wrap break-all">
          {stringify(value)}
        </pre>
      );
    }

    const geojson = toGeoJSON(geom);

    let mapLink: JSX.Element | null = null;

    if (geom.type === "Point") {
      const { x, y } = geom.coordinates;
      const url = buildMapUrl(y, x);

      mapLink = (
        <a
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          className="text-xs text-blue-500 hover:underline"
        >
          [open in map]
        </a>
      );
    }

    return (
      <div className="flex flex-col gap-2">
        <div className="flex items-center gap-2">
          <span className="text-[10px] text-muted-foreground">
            {geom.type}
          </span>
          {mapLink}
        </div>

        <pre className="font-mono text-xs whitespace-pre-wrap break-all">
          {JSON.stringify(geojson, null, 2)}
        </pre>
      </div>
    );
  },
};

export function registerPostGISRenderers(): void {
  typeRegistry.registerMany(["geometry", "geography"], geographyRenderer);
}
