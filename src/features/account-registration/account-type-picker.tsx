'use client';

import { Briefcase, Stethoscope } from 'lucide-react';
import { VETERINARY_ROLE } from '@/shared/utils/role';
import {
  REGISTRATION_ACCOUNT_TYPES,
  type RegistrationAccountType,
} from './types';

type Props = {
  onSelect: (type: RegistrationAccountType) => void;
};

export function AccountTypePicker({ onSelect }: Props) {
  return (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-xl font-bold text-slate-900">
          What are you registering as?
        </h2>
        <p className="mt-2 text-sm text-slate-600">
          Choose an account type. Every application is reviewed by ezInsure admin
          before access is granted.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {REGISTRATION_ACCOUNT_TYPES.map((item) => {
          const Icon = item.id === VETERINARY_ROLE ? Stethoscope : Briefcase;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => onSelect(item.id)}
              className="group rounded-xl border border-slate-200 bg-white p-5 text-left shadow-sm transition hover:border-[#126BB3] hover:shadow-md focus:outline-none focus:ring-2 focus:ring-[#126BB3]/40"
            >
              <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-lg bg-slate-100 text-[#126BB3] group-hover:bg-[#126BB3]/10">
                <Icon className="h-5 w-5" aria-hidden />
              </div>
              <h3 className="text-lg font-semibold text-slate-900">
                {item.title}
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-slate-600">
                {item.description}
              </p>
            </button>
          );
        })}
      </div>
    </div>
  );
}
