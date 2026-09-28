'use client';

import type { ReactNode } from 'react';

function DetailItem({
  label,
  value,
}: {
  label: string;
  value: ReactNode;
}) {
  return (
    <div className="min-w-0">
      <dt className="text-xs font-medium uppercase tracking-wide text-slate-500">
        {label}
      </dt>
      <dd className="mt-1 break-words text-sm font-medium text-slate-900">
        {value || '—'}
      </dd>
    </div>
  );
}

export function ProfileDetailGrid({
  items,
  columns = 2,
}: {
  items: Array<{ label: string; value: ReactNode }>;
  columns?: 2 | 3;
}) {
  return (
    <dl
      className={
        columns === 3
          ? 'grid grid-cols-1 gap-4 sm:grid-cols-3'
          : 'grid grid-cols-1 gap-4 sm:grid-cols-2'
      }
    >
      {items.map((item) => (
        <DetailItem key={item.label} label={item.label} value={item.value} />
      ))}
    </dl>
  );
}

export function ProfileSection({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: ReactNode;
}) {
  return (
    <section className="rounded-xl border border-slate-200 bg-slate-50/70 p-4 sm:p-5">
      <div className="mb-4">
        <h4 className="text-sm font-semibold text-slate-900">{title}</h4>
        {description ? (
          <p className="mt-0.5 text-xs text-slate-500">{description}</p>
        ) : null}
      </div>
      {children}
    </section>
  );
}
