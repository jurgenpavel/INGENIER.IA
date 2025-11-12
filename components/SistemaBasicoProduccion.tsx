'use client';
import React, { useState, useEffect, useMemo } from "react";

type TipoOperacion = "Manufactura" | "Automático";

type Fraccion = {
  id: string;
  indice: number;
  tipo: TipoOperacion;
  descripcion: string;
  // ya no hay tiempos por fracción
  tiempoRitmo: number | null;
  tiempoEstandar: number | null;
};

type SKUExt = {
  id: string;
  operacion: string;
  elementoEntrada: string;
  numeroFracciones: number;
  elementoSalida: string;
  numeroOperadores: number; // mantenido por compatibilidad visual
  valoracion: number; // 0.01 - 1.0
  holgura: number; // libre
  tiemposSKU: string; // "28.23, 28.97, ..."
  fracciones: Fraccion[];
  resumenTiempoRitmo: number | null;
  resumenTiempoEstandar: number | null;
  includeEnRitmo: boolean; // NUEVO: controlar si entra al cálculo del Tiempo Ritmo (global)
};

const fmt3 = (v: number | null | undefined) =>
  v === null || v === undefined || Number.isNaN(v) ? "" : v.toFixed(3);

const mean6 = (nums: number[]): number | null => {
  if (!nums.length) return null;
  const sum = nums.reduce((a, b) => a + b, 0);
  return Number((sum / nums.length).toFixed(6));
};

const defaultSku = (): SKUExt => ({
  id: "",
  operacion: "",
  elementoEntrada: "",
  numeroFracciones: 1,
  elementoSalida: "",
  numeroOperadores: 1,
  valoracion: 1,
  holgura: 1,
  tiemposSKU: "",
  fracciones: [],
  resumenTiempoRitmo: null,
  resumenTiempoEstandar: null,
  includeEnRitmo: true, // NUEVO
});

export default function SistemaBasicoProduccion() {
  const [tituloOperacion, setTituloOperacion] = useState<string>("");
  const [ingeniero, setIngeniero] = useState<string>("");
  const [skus, setSkus] = useState<SKUExt[]>([defaultSku()]);
  const [autogeneradas, setAutogeneradas] = useState<boolean>(false);

  const addSkuRow = () => setSkus((prev) => [...prev, defaultSku()]);
  const removeSkuRow = (idx: number) => setSkus((prev) => prev.filter((_, i) => i !== idx));

  const updateSku = (idx: number, patch: Partial<SKUExt>) => {
    setSkus((prev) => prev.map((s, i) => (i === idx ? { ...s, ...patch } : s)));
  };

  const updateFraccion = (skuIdx: number, frIdx: number, patch: Partial<Fraccion>) => {
    setSkus((prev) =>
      prev.map((sku, i) => {
        if (i !== skuIdx) return sku;
        const frs = sku.fracciones.map((f, j) => (j === frIdx ? { ...f, ...patch } : f));
        return { ...sku, fracciones: frs };
      })
    );
  };

  // Generar fracciones por SKU
  const generarTablas = () => {
    const siguiente = skus.map((sku) => {
      const n = Math.max(1, Number(sku.numeroFracciones || 1));
      let frs: Fraccion[] = sku.fracciones.length ? sku.fracciones : [];
      if (frs.length < n) {
        const faltan = n - frs.length;
        const baseIdx = frs.length;
        const nuevos: Fraccion[] = Array.from({ length: faltan }, (_, i) => ({
          id: `${sku.id || "SKU"}-${baseIdx + i + 1}`,
          indice: baseIdx + i + 1,
          tipo: "Manufactura",
          descripcion: "",
          tiempoRitmo: null,
          tiempoEstandar: null,
        }));
        frs = [...frs, ...nuevos];
      } else if (frs.length > n) {
        frs = frs.slice(0, n);
      }
      return { ...sku, fracciones: frs };
    });
    setSkus(siguiente);
    setAutogeneradas(true);
  };

  // Recalcular tiempos usando campo único de tiempos por SKU
  const recalcularTodo = () => {
    setSkus((prev) =>
      prev.map((sku) => {
        const values = (sku.tiemposSKU || "")
          .split(/[,;\s]+/)
          .map((t) => t.trim())
          .filter((t) => t.length)
          .map((t) => Number(t))
          .filter((v) => !Number.isNaN(v));

        const ritmoSKU = mean6(values); // Tiempo observado promedio
        const frs = sku.fracciones.map((f) => {
          const ritmo = ritmoSKU;
          const estandar =
            ritmo === null
              ? null
              : Number(((ritmo * Number(sku.valoracion || 0) * Number(sku.holgura || 0)) / 60).toFixed(6));
          return { ...f, tiempoRitmo: ritmo, tiempoEstandar: estandar };
        });

        const ritmos = frs.map((f) => f.tiempoRitmo).filter((v): v is number => v !== null);
        const estandares = frs.map((f) => f.tiempoEstandar).filter((v): v is number => v !== null);
        const trSKU =
          ritmos.length ? Number((ritmos.reduce((a, b) => a + b, 0) / ritmos.length).toFixed(6)) : null;
        const teSKU =
          estandares.length
            ? Number((estandares.reduce((a, b) => a + b, 0) / estandares.length).toFixed(6))
            : null;

        return { ...sku, fracciones: frs, resumenTiempoRitmo: trSKU, resumenTiempoEstandar: teSKU };
      })
    );
  };

  useEffect(() => {
    if (autogeneradas) recalcularTodo();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [JSON.stringify(skus.map((s) => ({
    tiempos: s.tiemposSKU,
    valoracion: s.valoracion,
    holgura: s.holgura,
    fracciones: s.numeroFracciones,
  })))]);

  // NUEVO: Tiempo Ritmo (global) = máximo TE(SKU) de los seleccionados
  const tiempoRitmoGlobal = useMemo(() => {
    const seleccionados = skus.filter(
      (s) => s.includeEnRitmo && s.resumenTiempoEstandar !== null
    );
    if (!seleccionados.length) return null;
    return Number(
      Math.max(...seleccionados.map((s) => s.resumenTiempoEstandar as number)).toFixed(6)
    );
  }, [skus]);

  return (
    <div className="p-6 max-w-[1200px] mx-auto space-y-8">
      <header className="space-y-3">
        <h1 className="text-2xl font-bold">INGENIER.IA · Etapa 1 — Sistema Básico de Producción</h1>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="text-sm font-medium">Nombre de la operación evaluada</label>
            <input
              className="mt-1 w-full border rounded px-2 py-1"
              value={tituloOperacion}
              onChange={(e) => setTituloOperacion(e.target.value)}
              placeholder="Ej. Raspado de cuero"
            />
          </div>
          <div>
            <label className="text-sm font-medium">Ingeniero responsable</label>
            <input
              className="mt-1 w-full border rounded px-2 py-1"
              value={ingeniero}
              onChange={(e) => setIngeniero(e.target.value)}
              placeholder="Ej. Juan Pérez"
            />
          </div>
        </div>
        <p className="text-sm text-gray-600">
          Capture los SKUs observados en el video y sus datos base. Luego genere las tablas de fracciones para calcular tiempos.
        </p>
      </header>

      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">Tabla inicial de SKUs</h2>
          <div className="space-x-2">
            <button onClick={addSkuRow} className="px-3 py-2 rounded-xl bg-gray-100 hover:bg-gray-200">Agregar SKU</button>
            <button onClick={generarTablas} className="px-3 py-2 rounded-xl bg-blue-600 text-white hover:bg-blue-700">Generar tablas por SKU</button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full border rounded-xl overflow-hidden">
            <thead className="bg-gray-50 text-sm">
              <tr>
                <th className="p-2 border">SKU</th>
                <th className="p-2 border">Operación</th>
                <th className="p-2 border">Elemento de entrada</th>
                <th className="p-2 border"># Fracciones</th>
                <th className="p-2 border">Elemento de salida</th>
                <th className="p-2 border"># Operadores</th>
                <th className="p-2 border">Valoración</th>
                <th className="p-2 border">Holgura</th>
                <th className="p-2 border">Tiempos observados (SKU)</th>
                <th className="p-2 border">TR (SKU)</th>
                <th className="p-2 border">TE (SKU)</th>
                <th className="p-2 border">Acciones</th>
              </tr>
            </thead>
            <tbody className="text-sm">
              {skus.map((sku, idx) => (
                <tr key={idx} className="odd:bg-white even:bg-gray-50">
                  <td className="p-2 border">
                    <input className="w-40 border rounded px-2 py-1" value={sku.id}
                      onChange={(e) => updateSku(idx, { id: e.target.value })} placeholder="SKU-001" />
                  </td>
                  <td className="p-2 border">
                    <input className="w-56 border rounded px-2 py-1" value={sku.operacion}
                      onChange={(e) => updateSku(idx, { operacion: e.target.value })} placeholder="Nombre de operación" />
                  </td>
                  <td className="p-2 border">
                    <input className="w-56 border rounded px-2 py-1" value={sku.elementoEntrada}
                      onChange={(e) => updateSku(idx, { elementoEntrada: e.target.value })} placeholder="Elemento de entrada" />
                  </td>
                  <td className="p-2 border">
                    <input type="number" min={1} className="w-24 border rounded px-2 py-1 text-right" value={sku.numeroFracciones}
                      onChange={(e) => updateSku(idx, { numeroFracciones: Number(e.target.value || 1) })} />
                  </td>
                  <td className="p-2 border">
                    <input className="w-56 border rounded px-2 py-1" value={sku.elementoSalida}
                      onChange={(e) => updateSku(idx, { elementoSalida: e.target.value })} placeholder="Elemento de salida" />
                  </td>
                  <td className="p-2 border">
                    <input type="number" min={1} className="w-24 border rounded px-2 py-1 text-right" value={sku.numeroOperadores}
                      onChange={(e) => updateSku(idx, { numeroOperadores: Number(e.target.value || 1) })} />
                  </td>
                  <td className="p-2 border">
                    <input type="number" step="0.01" min={0.01} max={1} className="w-24 border rounded px-2 py-1 text-right" value={sku.valoracion}
                      onChange={(e) => updateSku(idx, { valoracion: Number(e.target.value || 0) })} />
                  </td>
                  <td className="p-2 border">
                    <input type="number" step="0.000001" className="w-24 border rounded px-2 py-1 text-right" value={sku.holgura}
                      onChange={(e) => updateSku(idx, { holgura: Number(e.target.value || 0) })} />
                  </td>
                  <td className="p-2 border">
                    <input className="w-64 border rounded px-2 py-1" value={sku.tiemposSKU}
                      onChange={(e) => updateSku(idx, { tiemposSKU: e.target.value })} placeholder="28.23, 28.97, 28.70" />
                  </td>
                  <td className="p-2 border text-right">{fmt3(sku.resumenTiempoRitmo)}</td>
                  <td className="p-2 border text-right">{fmt3(sku.resumenTiempoEstandar)}</td>
                  <td className="p-2 border text-center">
                    <button onClick={() => removeSkuRow(idx)} className="px-2 py-1 text-red-700 hover:underline">Eliminar</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* NUEVO: Cálculo de Tiempo Ritmo (máximo de TE seleccionados) */}
        <div className="mt-4 border rounded-2xl p-4 bg-white shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-base font-semibold">Cálculo de Tiempo Ritmo (seleccione SKUs a considerar)</h3>
            <button
              onClick={() => setSkus((prev) => prev.map((s) => ({ ...s, includeEnRitmo: true })))}
              className="px-2 py-1 rounded bg-gray-100 hover:bg-gray-200 text-sm"
            >
              Seleccionar todos
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full border rounded-xl overflow-hidden text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="p-2 border">Incluir</th>
                  <th className="p-2 border">SKU</th>
                  <th className="p-2 border">Operación</th>
                  <th className="p-2 border">TE (SKU)</th>
                </tr>
              </thead>
              <tbody>
                {skus.map((s, i) => (
                  <tr key={`sel-${i}`} className="odd:bg-white even:bg-gray-50">
                    <td className="p-2 border text-center">
                      <input
                        type="checkbox"
                        checked={s.includeEnRitmo}
                        onChange={(e) => updateSku(i, { includeEnRitmo: e.target.checked })}
                      />
                    </td>
                    <td className="p-2 border">{s.id || "—"}</td>
                    <td className="p-2 border">{s.operacion || "—"}</td>
                    <td className="p-2 border text-right">{fmt3(s.resumenTiempoEstandar)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="mt-3 flex items-center justify-between">
            <div className="text-sm text-gray-600">
              Regla: <span className="font-medium">Tiempo Ritmo = máximo</span> de los{" "}
              <span className="font-medium">TE (SKU)</span> seleccionados.
            </div>
            <div className="text-base font-semibold">
              Tiempo Ritmo (global): {fmt3(tiempoRitmoGlobal)}
            </div>
          </div>
        </div>
      </section>

      {autogeneradas && (
        <section className="space-y-8">
          {skus.map((sku, sIdx) => (
            <div key={`sku-fr-${sIdx}`} className="border rounded-2xl p-4 shadow-sm bg-white">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-base font-semibold">{sku.id || "SKU"} — Fracciones ({sku.numeroFracciones})</h3>
                <div className="text-xs text-gray-500">
                  Elemento de entrada: <span className="font-medium">{sku.elementoEntrada || "—"}</span> · Elemento de salida: <span className="font-medium">{sku.elementoSalida || "—"}</span>
                </div>
              </div>
              <div className="overflow-x-auto">
                <table className="min-w-full border rounded-xl overflow-hidden">
                  <thead className="bg-gray-50 text-sm">
                    <tr>
                      <th className="p-2 border">#</th>
                      <th className="p-2 border">Tipo</th>
                      <th className="p-2 border">Descripción de fracción</th>
                      <th className="p-2 border">TR (fracción)</th>
                      <th className="p-2 border">TE (fracción)</th>
                    </tr>
                  </thead>
                  <tbody className="text-sm">
                    {sku.fracciones.map((f, fIdx) => (
                      <tr key={`f-${fIdx}`} className="odd:bg-white even:bg-gray-50">
                        <td className="p-2 border text-center w-12">{f.indice}</td>
                        <td className="p-2 border w-40">
                          <select
                            className="w-full border rounded px-2 py-1"
                            value={f.tipo}
                            onChange={(e) => updateFraccion(sIdx, fIdx, { tipo: e.target.value as TipoOperacion })}
                          >
                            <option value="Manufactura">Manufactura</option>
                            <option value="Automático">Automático</option>
                          </select>
                        </td>
                        <td className="p-2 border">
                          <input
                            className="w-72 border rounded px-2 py-1"
                            placeholder="Ej. Separar cuero sucesor"
                            value={f.descripcion}
                            onChange={(e) => updateFraccion(sIdx, fIdx, { descripcion: e.target.value })}
                          />
                        </td>
                        <td className="p-2 border text-right w-32">{fmt3(f.tiempoRitmo)}</td>
                        <td className="p-2 border text-right w-32">{fmt3(f.tiempoEstandar)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="flex items-center justify-between mt-3">
                <div className="text-sm text-gray-600">
                  Resumen {sku.id || "SKU"}: TR={fmt3(sku.resumenTiempoRitmo)} · TE={fmt3(sku.resumenTiempoEstandar)}
                </div>
                <div className="space-x-2">
                  <button onClick={recalcularTodo} className="px-3 py-2 rounded-xl bg-gray-100 hover:bg-gray-200">Recalcular</button>
                </div>
              </div>
            </div>
          ))}
        </section>
      )}

      <footer className="flex items-center justify-end gap-3 pt-4">
        <button
          onClick={() => window.print()}
          className="px-3 py-2 rounded-xl bg-gray-100 hover:bg-gray-200"
        >
          Exportar (temporal)
        </button>
        <button
          onClick={() => alert("Etapa 1 guardada. Puedes continuar con la siguiente etapa.")}
          className="px-4 py-2 rounded-2xl bg-emerald-600 text-white hover:bg-emerald-700"
        >
          Siguiente etapa
        </button>
      </footer>
    </div>
  );
}
