"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { diagnoseBackend, type BackendDiagnostics } from "@/lib/api";
import "./runtime-rig.css";

type Point3 = readonly [number, number, number];
type RigState = "checking" | "api-down" | "database-down" | "ready";

const SCALE = 1.4;
const ORIGIN = { x: 320, y: 235 };
const COS_30 = Math.cos(Math.PI / 6);

function project([x, y, z]: Point3): [number, number] {
  return [
    ORIGIN.x + (x - y) * COS_30 * SCALE,
    ORIGIN.y + (x + y) * 0.5 * SCALE - z * SCALE,
  ];
}

function path(points: Array<[number, number]>, closed = true): string {
  return `${points.map(([x, y], index) => `${index ? "L" : "M"}${x.toFixed(1)} ${y.toFixed(1)}`).join("")}${closed ? "Z" : ""}`;
}

interface CuboidProps {
  id: string;
  x: number;
  y: number;
  z: number;
  w: number;
  d: number;
  h: number;
  tone?: "lo" | "mid" | "hi" | "lit";
  className?: string;
}

function Cuboid({ id, x, y, z, w, d, h, tone = "mid", className = "" }: CuboidProps) {
  const a = project([x, y, z + h]);
  const b = project([x + w, y, z + h]);
  const c = project([x + w, y + d, z + h]);
  const d1 = project([x, y + d, z + h]);
  const a0 = project([x, y, z]);
  const b0 = project([x + w, y, z]);
  const c0 = project([x + w, y + d, z]);

  return (
    <g data-part={id} data-tone={tone} className={`rig-solid ${className}`}>
      <path className="rig-face rig-face-left" d={path([b, c, c0, b0])} />
      <path className="rig-face rig-face-right" d={path([a, b, b0, a0])} />
      <path className="rig-face rig-face-top" d={path([a, b, c, d1])} />
      <path className="rig-edge" d={`${path([a, b, c, d1])}${path([a, a0, b0, b], false)}${path([b0, c0, c], false)}`} />
    </g>
  );
}

interface CylinderProps {
  id: string;
  x: number;
  y: number;
  z: number;
  r: number;
  h: number;
  tone?: "lo" | "mid" | "hi" | "lit";
}

function Cylinder({ id, x, y, z, r, h, tone = "mid" }: CylinderProps) {
  const [bx, by] = project([x, y, z]);
  const [tx, ty] = project([x, y, z + h]);
  const rx = r * SCALE;
  const ry = r * SCALE * 0.42;
  const side = `M${tx - rx} ${ty}L${bx - rx} ${by}A${rx} ${ry} 0 0 0 ${bx + rx} ${by}L${tx + rx} ${ty}A${rx} ${ry} 0 0 1 ${tx - rx} ${ty}Z`;
  return (
    <g data-part={id} data-tone={tone} className="rig-solid">
      <path className="rig-face rig-cylinder-side" d={side} />
      <ellipse className="rig-face rig-face-top" cx={tx} cy={ty} rx={rx} ry={ry} />
      <path className="rig-edge" d={side} />
      <ellipse className="rig-edge" cx={tx} cy={ty} rx={rx} ry={ry} />
    </g>
  );
}

const P = (point: Point3) => project(point).map((value) => value.toFixed(1)).join(" ");

function ConnectionLines() {
  const first = [project([-72, 2, 25]), project([-25, 2, 25]), project([-10, 2, 29])] as Array<[number, number]>;
  const second = [project([25, 2, 29]), project([60, 2, 29]), project([78, 2, 34])] as Array<[number, number]>;
  return (
    <g aria-hidden="true">
      <path className="rig-cable iso-line" d={path(first, false)} />
      <path className="rig-cable iso-line" d={path(second, false)} />
      {[first[0], first.at(-1), second[0], second.at(-1)].filter(Boolean).map((point, index) => (
        <circle key={index} className="rig-terminal" cx={point![0]} cy={point![1]} r="2.2" />
      ))}
    </g>
  );
}

function RigDrawing({ state }: { state: RigState }) {
  const baseScrews: Point3[] = [[-128, -58, 1], [128, -58, 1], [-128, 58, 1], [128, 58, 1]];
  const keyboardKeys = Array.from({ length: 6 }, (_, index) => ({ x: -104 + (index % 3) * 8, y: 21 + Math.floor(index / 3) * 7 }));
  const apiRibs = Array.from({ length: 6 }, (_, index) => -10 + index * 4);
  const dbBands = [20, 38, 56];

  return (
    <svg className="runtime-rig-svg" viewBox="0 0 640 400" role="img" aria-label="Banco isométrico que comprueba la conexión entre el navegador, FastAPI y PostgreSQL">
      <defs>
        <filter id="rig-shadow" x="-20%" y="-30%" width="140%" height="170%">
          <feGaussianBlur stdDeviation="7" />
        </filter>
      </defs>

      <ellipse className="rig-halo" cx="320" cy="330" rx="244" ry="37" filter="url(#rig-shadow)" />

      {/* Inventario físico: base y fijación (11), bastidor (14), consola (12),
          bomba API (11), depósito DB (9), indicador (5) y carro (5): 67 sólidos. */}
      {[-118, 118].flatMap((x) => [-50, 50].map((y) => <Cylinder key={`foot-${x}-${y}`} id={`foot-${x}-${y}`} x={x} y={y} z={-18} r={7} h={8} tone="lo" />))}
      <Cuboid id="bedplate" x={-140} y={-70} z={-10} w={280} d={140} h={10} tone="lo" />
      <Cuboid id="ruler-strip" x={-122} y={52} z={0} w={238} d={6} h={1.5} tone="lo" />
      {baseScrews.map(([x, y, z], index) => {
        const [cx, cy] = project([x, y, z]);
        return <circle key={`base-screw-${index}`} className="rig-screw" cx={cx} cy={cy} r="2" />;
      })}

      <Cuboid id="rail-rear" x={-116} y={-12} z={1} w={232} d={5} h={4} tone="mid" />
      <Cuboid id="rail-front" x={-116} y={18} z={1} w={232} d={5} h={4} tone="mid" />
      <Cuboid id="stop-left" x={-121} y={-16} z={1} w={5} d={44} h={10} tone="mid" />
      <Cuboid id="stop-right" x={116} y={-16} z={1} w={5} d={44} h={10} tone="mid" />

      {[-112, -68, -18, 35, 82, 120].map((x, index) => (
        <g key={`post-${x}`}>
          <Cuboid id={`post-base-${index}`} x={x - 5} y={-49} z={0} w={10} d={10} h={4} tone="lo" />
          <Cuboid id={`post-${index}`} x={x - 2} y={-46} z={4} w={4} d={4} h={36} tone="mid" />
        </g>
      ))}
      <Cuboid id="frame-back" x={-116} y={-47} z={38} w={240} d={6} h={5} tone="mid" />
      <Cuboid id="frame-front" x={-116} y={-47} z={20} w={240} d={6} h={4} tone="mid" />

      <ConnectionLines />

      <Cuboid id="console-foot-a" x={-109} y={-5} z={5} w={8} d={10} h={7} tone="lo" />
      <Cuboid id="console-foot-b" x={-78} y={-5} z={5} w={8} d={10} h={7} tone="lo" />
      <Cuboid id="console-neck" x={-99} y={-2} z={8} w={18} d={9} h={8} tone="mid" />
      <Cuboid id="console-case" x={-112} y={-11} z={16} w={48} d={30} h={39} tone="hi" />
      <Cuboid id="console-screen" x={-105} y={18} z={25} w={31} d={2} h={21} tone="hi" className="rig-screen" />
      <Cuboid id="console-keyboard" x={-108} y={20} z={7} w={40} d={18} h={3} tone="mid" />
      {keyboardKeys.map(({ x, y }, index) => <Cuboid key={`key-${index}`} id={`console-key-${index}`} x={x} y={y} z={10} w={5} d={4} h={1} tone="lo" />)}
      <Cuboid id="console-port" x={-65} y={-2} z={27} w={3} d={8} h={8} tone="mid" />

      <Cuboid id="api-stand" x={-25} y={-11} z={5} w={50} d={31} h={7} tone="lo" />
      <Cylinder id="api-motor" x={0} y={4} z={12} r={17} h={35} tone="hi" />
      <Cylinder id="api-cap" x={0} y={4} z={47} r={14} h={7} tone="mid" />
      <Cylinder id="api-valve" x={0} y={4} z={54} r={6} h={8} tone="hi" />
      <Cuboid id="api-port-left" x={-24} y={0} z={26} w={8} d={8} h={8} tone="mid" />
      <Cuboid id="api-port-right" x={16} y={0} z={26} w={8} d={8} h={8} tone="mid" />
      {apiRibs.map((offset, index) => <Cylinder key={`api-rib-${index}`} id={`api-rib-${index}`} x={0} y={4} z={23 + index * 4} r={18} h={1.4} tone="lo" />)}

      <Cuboid id="db-foot-a" x={70} y={-3} z={4} w={10} d={12} h={8} tone="lo" />
      <Cuboid id="db-foot-b" x={108} y={-3} z={4} w={10} d={12} h={8} tone="lo" />
      <Cuboid id="db-stand" x={68} y={-10} z={4} w={53} d={35} h={8} tone="lo" />
      <Cylinder id="db-tank" x={95} y={7} z={12} r={21} h={57} tone="hi" />
      {dbBands.map((z, index) => <Cylinder key={`db-band-${z}`} id={`db-band-${index}`} x={95} y={7} z={z} r={22} h={2.5} tone="mid" />)}
      <Cylinder id="db-lid" x={95} y={7} z={69} r={18} h={7} tone="mid" />
      <Cuboid id="db-port" x={70} y={3} z={31} w={8} d={9} h={9} tone="mid" />
      <Cuboid id="db-rear-terminal" x={112} y={-4} z={46} w={7} d={8} h={12} tone="mid" />

      <Cuboid id="gauge-stand" x={114} y={-42} z={2} w={12} d={12} h={31} tone="lo" />
      <Cylinder id="gauge-body" x={120} y={-36} z={33} r={15} h={7} tone="hi" />
      <Cylinder id="gauge-bezel" x={120} y={-36} z={40} r={13} h={2} tone="mid" />
      <path className="rig-gauge-needle iso-line" data-free="end" d={`M${P([120, -36, 42])}L${P([127, -41, 42.5])}`} />
      <circle className="rig-gauge-hub" cx={project([120, -36, 42])[0]} cy={project([120, -36, 42])[1]} r="2.2" />

      <g className="rig-carriage" data-state={state}>
        <Cuboid id="request-carriage" x={-92} y={8} z={7} w={24} d={18} h={7} tone="lit" />
        {[-89, -73].flatMap((x) => [10, 21].map((y) => <Cylinder key={`bushing-${x}-${y}`} id={`bushing-${x}-${y}`} x={x} y={y} z={14} r={2.2} h={2} tone="mid" />))}
      </g>
    </svg>
  );
}

function stateFrom(result: BackendDiagnostics): RigState {
  if (!result.api) return "api-down";
  return result.database ? "ready" : "database-down";
}

export function RuntimeRig() {
  const [state, setState] = useState<RigState>("checking");
  const [result, setResult] = useState<BackendDiagnostics | null>(null);

  const run = useCallback(async () => {
    setState("checking");
    const diagnostic = await diagnoseBackend();
    setResult(diagnostic);
    setState(stateFrom(diagnostic));
  }, []);

  useEffect(() => {
    let active = true;
    diagnoseBackend().then((diagnostic) => {
      if (!active) return;
      setResult(diagnostic);
      setState(stateFrom(diagnostic));
    });
    return () => { active = false; };
  }, []);

  const readout = useMemo(() => {
    if (state === "checking") return "comprobando…";
    const available = 1 + Number(Boolean(result?.api)) + Number(Boolean(result?.database));
    return `${available}/3 enlaces · ${state === "ready" ? "listo" : "interrumpido"}`;
  }, [result, state]);

  const checkedTime = result ? new Intl.DateTimeFormat("es-CO", { hour: "2-digit", minute: "2-digit", second: "2-digit", timeZone: "America/Bogota" }).format(new Date(result.checkedAt)) : "—";

  return (
    <figure className="runtime-figure iso" data-theme="light">
      <div className="runtime-plate iso-plate">
        <div className="runtime-corners" aria-hidden="true">
          <span className="runtime-corner runtime-fig">Fig 1</span>
          <span className="runtime-corner runtime-title">Banco de comunicación local</span>
          <span className="runtime-corner runtime-hint">Activar prueba ↵</span>
          <span className="runtime-corner runtime-readout" data-readout>{readout}</span>
        </div>
        <RigDrawing state={state} />
      </div>

      <figcaption className="runtime-caption">
        <div className="runtime-status-grid" aria-live="polite">
          <span data-ok="true"><i /> Navegador</span>
          <span data-ok={result?.api ? "true" : "false"}><i /> FastAPI</span>
          <span data-ok={result?.database ? "true" : "false"}><i /> PostgreSQL</span>
        </div>
        <div className="runtime-result">
          <p>{state === "checking" ? "Ejecutando comprobación de extremo a extremo…" : result?.message}</p>
          <span>Última prueba: {checkedTime}</span>
        </div>
        <button type="button" onClick={run} disabled={state === "checking"} className="runtime-retry">
          {state === "checking" ? "Comprobando" : "Probar de nuevo"}
        </button>
      </figcaption>
      <p className="runtime-explanation">
        La cápsula representa una solicitud real. Avanza por el riel hasta FastAPI y solo llega al depósito cuando <code>/health/ready</code> confirma la conexión con PostgreSQL.
      </p>
    </figure>
  );
}
