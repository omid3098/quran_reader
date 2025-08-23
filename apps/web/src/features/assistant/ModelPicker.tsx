'use client'

import { useEffect, useMemo, useState } from 'react';

export function ModelPicker({
  providerId,
  assistant,
  value,
  onChange,
}: {
  providerId: string;
  assistant: ReturnType<typeof import('./useAssistant').createAssistant>;
  value?: string;
  onChange: (v: string) => void;
}) {
  const [models, setModels] = useState<Array<{ id: string; name?: string; free?: boolean }>>([]);
  const [q, setQ] = useState('');
  const [onlyFree, setOnlyFree] = useState(false);

  useEffect(() => {
    let alive = true;
    (async () => {
      const list = (await assistant.listModels()) as any[];
      if (alive) setModels(list);
    })();
    return () => {
      alive = false;
    };
  }, [assistant, providerId]);

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return models.filter((m) => {
      if (onlyFree && !m.free) return false;
      return (
        !needle ||
        m.id.toLowerCase().includes(needle) ||
        (m.name ?? '').toLowerCase().includes(needle)
      );
    });
  }, [models, q, onlyFree]);

  const showFreeToggle = providerId === 'openrouter';

  return (
    <div className="grid gap-2">
      <div className="flex gap-2 items-center">
        <input
          className="border rounded p-1 flex-1"
          placeholder="Search models…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
        {showFreeToggle ? (
          <label className="flex items-center gap-1 text-sm">
            <input
              type="checkbox"
              checked={onlyFree}
              onChange={(e) => setOnlyFree(e.target.checked)}
            />
            Free only
          </label>
        ) : null}
      </div>
      <select
        className="border rounded p-1"
        value={value}
        onChange={(e) => onChange(e.target.value)}
      >
        {filtered.map((m) => (
          <option key={m.id} value={m.id}>
            {m.name ?? m.id}
            {m.free ? ' (free)' : ''}
          </option>
        ))}
      </select>
    </div>
  );
}
