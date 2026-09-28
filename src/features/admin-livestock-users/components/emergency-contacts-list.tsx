'use client';

import type { ApplicationEmergencyContact } from './vet-application-types';
import { ProfileSection } from './profile-section';

export function EmergencyContactsList({
  contacts,
}: {
  contacts?: ApplicationEmergencyContact[] | null;
}) {
  const list = contacts?.filter(
    (c) => c.fullName?.trim() || c.phoneNumber?.trim() || c.relationship?.trim(),
  );

  return (
    <ProfileSection
      title="Emergency contacts"
      description="Optional contacts provided with the application."
    >
      {list && list.length > 0 ? (
        <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {list.map((contact, index) => (
            <li
              key={contact._id || `${contact.phoneNumber}-${index}`}
              className="rounded-lg border border-slate-200 bg-white p-3"
            >
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                Contact {index + 1}
              </p>
              <p className="mt-1 text-sm font-medium text-slate-900">
                {contact.fullName || '—'}
              </p>
              <p className="text-sm text-slate-600">
                {contact.phoneNumber || '—'}
              </p>
              <p className="text-xs capitalize text-slate-500">
                {contact.relationship || '—'}
              </p>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-sm text-slate-500">No emergency contacts provided.</p>
      )}
    </ProfileSection>
  );
}
