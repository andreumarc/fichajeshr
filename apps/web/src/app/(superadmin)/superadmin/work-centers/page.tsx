'use client';
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import api from '@/lib/api';
import {
  MapPin, Search, Loader2, Eye, CheckCircle2, XCircle, ChevronDown,
} from 'lucide-react';
import Link from 'next/link';

interface WorkCenter {
  id: string;
  name: string;
  code: string | null;
  city: string | null;
  address: string | null;
  isActive: boolean;
  requireGps: boolean;
  radiusMeters: number;
  company: { id: string; name: string };
  _count: { employees: number };
}

export default function WorkCentersPage() {
  const [search, setSearch]   = useState('');
  const [filter, setFilter]   = useState<'all' | 'active' | 'inactive'>('all');

  const { data: centers, isLoading } = useQuery<WorkCenter[]>({
    queryKey: ['superadmin-work-centers'],
    queryFn: () => api.get('/superadmin/work-centers').then(r => r.data),
  });

  const filtered = (centers ?? []).filter(c => {
    const q = search.toLowerCase();
    const matchSearch =
      c.name.toLowerCase().includes(q) ||
      (c.city ?? '').toLowerCase().includes(q) ||
      c.company.name.toLowerCase().includes(q) ||
      (c.code ?? '').toLowerCase().includes(q);
    const matchFilter =
      filter === 'all' ? true : filter === 'active' ? c.isActive : !c.isActive;
    return matchSearch && matchFilter;
  });

  return (
    <div className="space-y-6">

      {/* Header */}
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-brand-800">Centros de trabajo</h1>
          <p className="text-slate-500 text-sm mt-0.5">
            {centers?.length ?? 0} centro{(centers?.length ?? 0) !== 1 ? 's' : ''} registrado{(centers?.length ?? 0) !== 1 ? 's' : ''}
          </p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            className="input pl-10"
            placeholder="Buscar centro, empresa, ciudad..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
        <div className="relative">
          <select
            className="input pr-10 appearance-none cursor-pointer"
            value={filter}
            onChange={e => setFilter(e.target.value as any)}
          >
            <option value="all">Todos</option>
            <option value="active">Activos</option>
            <option value="inactive">Inactivos</option>
          </select>
          <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
        </div>
      </div>

      {/* Table */}
      <div className="card p-0 overflow-hidden">
        {isLoading ? (
          <div className="flex items-center justify-center py-20 gap-2 text-slate-400">
            <Loader2 size={18} className="animate-spin" />
            <span className="text-sm">Cargando centros...</span>
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-20">
            <MapPin size={40} className="text-slate-200 mx-auto mb-3" />
            <p className="text-slate-400 text-sm">
              {search || filter !== 'all' ? 'No se encontraron centros con ese filtro' : 'No hay centros de trabajo registrados'}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr>
                  <th className="table-header">Centro</th>
                  <th className="table-header">Empresa</th>
                  <th className="table-header">Ciudad</th>
                  <th className="table-header text-center">Empleados</th>
                  <th className="table-header text-center">GPS</th>
                  <th className="table-header text-center">Radio</th>
                  <th className="table-header">Estado</th>
                  <th className="table-header text-right pr-5">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((center, idx) => (
                  <tr
                    key={center.id}
                    className={`border-b border-slate-50 hover:bg-slate-50/70 transition-colors ${idx % 2 === 0 ? '' : 'bg-slate-50/30'}`}
                  >
                    <td className="table-cell">
                      <div>
                        <p className="font-semibold text-brand-800">{center.name}</p>
                        {center.code && (
                          <p className="text-xs font-mono text-slate-400 mt-0.5">{center.code}</p>
                        )}
                      </div>
                    </td>
                    <td className="table-cell text-slate-600">{center.company.name}</td>
                    <td className="table-cell text-slate-500">{center.city ?? '—'}</td>
                    <td className="table-cell text-center tabular-nums">{center._count.employees}</td>
                    <td className="table-cell text-center">
                      {center.requireGps
                        ? <CheckCircle2 size={15} className="text-emerald-500 mx-auto" />
                        : <XCircle size={15} className="text-slate-300 mx-auto" />
                      }
                    </td>
                    <td className="table-cell text-center text-slate-500 tabular-nums text-sm">
                      {center.radiusMeters}m
                    </td>
                    <td className="table-cell">
                      {center.isActive
                        ? <span className="badge-accent">Activo</span>
                        : <span className="badge-red">Inactivo</span>
                      }
                    </td>
                    <td className="table-cell text-right">
                      <Link
                        href={`/superadmin/companies/${center.company.id}`}
                        className="inline-flex items-center gap-1.5 text-xs font-semibold text-brand-600 hover:text-brand-800 transition-colors"
                        title="Ver empresa"
                      >
                        <Eye size={13} />
                        Ver empresa
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
