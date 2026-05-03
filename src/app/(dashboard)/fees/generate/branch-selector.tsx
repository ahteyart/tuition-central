"use client";

import { useEffect, useState } from "react";

interface Branch {
  id: string;
  name: string;
}

export function BranchSelector({
  value,
  onChange,
}: {
  value: string;
  onChange: (v: string) => void;
}) {
  const [branches, setBranches] = useState<Branch[]>([]);

  useEffect(() => {
    fetch("/api/branches")
      .then(r => r.json())
      .then((data: Branch[]) => {
        setBranches(data);
        if (data.length === 1 && !value) onChange(data[0].id);
      })
      .catch(() => {});
  }, []);

  return (
    <select
      value={value}
      onChange={e => onChange(e.target.value)}
      required
      className="w-full h-9 rounded-md border border-gray-300 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-600"
    >
      <option value="">Select branch…</option>
      {branches.map(b => (
        <option key={b.id} value={b.id}>{b.name}</option>
      ))}
    </select>
  );
}
