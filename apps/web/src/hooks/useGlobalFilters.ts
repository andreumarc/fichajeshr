'use client';
/**
 * useGlobalFilters — reads the GlobalFilters URL params and returns:
 *   - raw values (dateFrom, dateTo, companyId, workCenterIds)
 *   - httpParams: object ready to spread into api.get(url, { params })
 *   - queryKeyPart: array to append to react-query queryKey for auto-refetch
 *
 * Pages that render list/stats views should use this hook so the top filter
 * bar reactively drives their queries. Must be called inside a component
 * wrapped in a <Suspense> boundary (required because of useSearchParams).
 */
import { useSearchParams } from 'next/navigation';

export function useGlobalFilters() {
  const sp = useSearchParams();

  const dateFrom      = sp.get('date_from')       ?? '';
  const dateTo        = sp.get('date_to')         ?? '';
  const companyId     = sp.get('company_id')      ?? '';
  const workCenterIds = sp.get('work_center_ids') ?? '';

  const httpParams: Record<string, string> = {};
  if (dateFrom)      httpParams.date_from       = dateFrom;
  if (dateTo)        httpParams.date_to         = dateTo;
  if (companyId)     httpParams.company_id      = companyId;
  if (workCenterIds) httpParams.work_center_ids = workCenterIds;

  return {
    dateFrom,
    dateTo,
    companyId,
    workCenterIds,
    httpParams,
    queryKeyPart: [dateFrom, dateTo, companyId, workCenterIds] as const,
  };
}
