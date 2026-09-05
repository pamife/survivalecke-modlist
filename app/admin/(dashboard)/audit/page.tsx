import { createClient } from '@/lib/supabase/server';
import type { AuditLog } from '@/types/database';

export const dynamic = 'force-dynamic';

export default async function AdminAuditPage() {
  const supabase = await createClient();

  const { data: logs } = await supabase
    .from('audit_logs')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(100);

  const auditList: AuditLog[] = logs || [];

  return (
    <div className="space-y-6">
      <div className="border-b border-[#232730] pb-5">
        <h1 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
          Audit-Protokoll
        </h1>
        <p className="text-xs text-zinc-400 mt-0.5">
          Unveränderliche Historie aller administrativen Änderungen und Prüfentscheidungen
        </p>
      </div>

      {auditList.length > 0 ? (
        <div className="border border-[#232730] rounded-md overflow-hidden bg-[#14161b]">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-[#232730] bg-[#101216] text-[11px] font-semibold text-zinc-400 uppercase tracking-wider">
                  <th className="py-3 px-4">Zeitpunkt</th>
                  <th className="py-3 px-4">Aktion</th>
                  <th className="py-3 px-4">Objekt / Mod</th>
                  <th className="py-3 px-4">Administrator</th>
                  <th className="py-3 px-4">Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#1e222a]">
                {auditList.map((log) => (
                  <tr key={log.id} className="hover:bg-[#181b22] transition-colors">
                    <td className="py-3 px-4 text-zinc-400 font-mono text-[11px]">
                      {new Date(log.created_at).toLocaleString('de-DE', {
                        day: '2-digit',
                        month: '2-digit',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </td>
                    <td className="py-3 px-4">
                      <span className="font-mono text-emerald-400 font-medium">
                        {log.action}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-zinc-200 font-medium">
                      {log.entity_name || log.entity_id || '–'}
                    </td>
                    <td className="py-3 px-4 text-zinc-300">
                      {log.user_email || 'System'}
                    </td>
                    <td className="py-3 px-4 text-zinc-400">
                      {log.old_values || log.new_values ? (
                        <details className="cursor-pointer">
                          <summary className="hover:text-zinc-200">Diff anzeigen</summary>
                          <pre className="mt-2 p-2 bg-[#101216] border border-[#20242e] rounded text-[10px] text-zinc-400 font-mono overflow-x-auto max-w-xs sm:max-w-md">
                            {JSON.stringify(
                              {
                                old: log.old_values,
                                new: log.new_values,
                              },
                              null,
                              2
                            )}
                          </pre>
                        </details>
                      ) : (
                        '–'
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="border border-[#232730] rounded-md p-12 text-center bg-[#14161b] text-xs text-zinc-400">
          Noch keine Audit-Logs vorhanden (0 Aktionen protokolliert).
        </div>
      )}
    </div>
  );
}
