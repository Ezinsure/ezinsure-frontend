'use client';

import { useMemo } from 'react';
import { LivestockSelect, LivestockTextField } from '@/features/livestock-application/components/form-controls';
import {
  getCellNamesForDistrictSector,
  getDistrictNamesForProvince,
  getProvinceNames,
  getSectorNamesForDistrict,
} from '@/features/livestock-application/utils/location';

export type LocationPrefix = 'applicant' | 'livestock';

interface RwandaLocationFieldsProps {
  prefix: LocationPrefix;
  province: string;
  district: string;
  sector: string;
  cell: string;
  village: string;
  onProvinceChange: (v: string) => void;
  onDistrictChange: (v: string) => void;
  onSectorChange: (v: string) => void;
  onCellChange: (v: string) => void;
  onVillageChange: (v: string) => void;
  errors?: Record<string, string>;
  disabled?: boolean;
}

export function RwandaLocationFields({
  prefix,
  province,
  district,
  sector,
  cell,
  village,
  onProvinceChange,
  onDistrictChange,
  onSectorChange,
  onCellChange,
  onVillageChange,
  errors = {},
  disabled,
}: RwandaLocationFieldsProps) {
  const provinceField = prefix === 'applicant' ? 'applicantProvince' : 'livestockProvince';
  const districtField = prefix === 'applicant' ? 'applicantDistrict' : 'district';
  const sectorField = prefix === 'applicant' ? 'applicantSector' : 'sector';
  const cellField = prefix === 'applicant' ? 'applicantCell' : 'cell';
  const villageField = prefix === 'applicant' ? 'applicantVillage' : 'village';

  const provinces = useMemo(() => getProvinceNames().map((p) => ({ value: p, label: p })), []);
  const districts = useMemo(() => {
    if (province) return getDistrictNamesForProvince(province).map((d) => ({ value: d, label: d }));
    return [];
  }, [province]);
  const sectors = useMemo(
    () => (district ? getSectorNamesForDistrict(district).map((s) => ({ value: s, label: s })) : []),
    [district],
  );
  const cells = useMemo(
    () =>
      district && sector
        ? getCellNamesForDistrictSector(district, sector).map((c) => ({ value: c, label: c }))
        : [],
    [district, sector],
  );

  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
      <LivestockSelect
        fieldName={provinceField}
        value={province}
        onChange={(v) => {
          onProvinceChange(v);
          onDistrictChange('');
          onSectorChange('');
          onCellChange('');
        }}
        options={provinces}
        error={errors[provinceField]}
        required
        disabled={disabled}
      />
      <LivestockSelect
        fieldName={districtField}
        value={district}
        onChange={(v) => {
          onDistrictChange(v);
          onSectorChange('');
          onCellChange('');
        }}
        options={districts}
        error={errors[districtField]}
        required
        disabled={disabled || !province}
      />
      <LivestockSelect
        fieldName={sectorField}
        value={sector}
        onChange={(v) => {
          onSectorChange(v);
          onCellChange('');
        }}
        options={sectors}
        error={errors[sectorField]}
        required
        disabled={disabled || !district}
      />
      <LivestockSelect
        fieldName={cellField}
        value={cell}
        onChange={onCellChange}
        options={cells}
        error={errors[cellField]}
        required
        disabled={disabled || !sector}
      />
      <div className="sm:col-span-2">
        <LivestockTextField
          fieldName={villageField}
          value={village}
          onChange={onVillageChange}
          error={errors[villageField]}
          required
          disabled={disabled}
        />
      </div>
    </div>
  );
}
