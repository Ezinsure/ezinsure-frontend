import { rwandaProvinces, type AdministrativeDivision } from '@/utils/rwanda-administrative';

export interface DistrictOption {
  name: string;
  provinceName: string;
}

export function getAllDistrictOptions(): DistrictOption[] {
  const options: DistrictOption[] = [];
  for (const province of rwandaProvinces) {
    for (const district of province.districts ?? []) {
      options.push({ name: district.name, provinceName: province.name });
    }
  }
  return options.sort((a, b) => a.name.localeCompare(b.name));
}

export function findDistrictEntry(districtName: string): {
  province: AdministrativeDivision;
  district: AdministrativeDivision;
} | null {
  for (const province of rwandaProvinces) {
    const district = province.districts?.find((d) => d.name === districtName);
    if (district) return { province, district };
  }
  return null;
}

export function getSectorNamesForDistrict(districtName: string): string[] {
  const entry = findDistrictEntry(districtName);
  if (!entry?.district.sectors) return [];
  return entry.district.sectors.map((s) => s.name).sort((a, b) => a.localeCompare(b));
}

export function getCellNamesForDistrictSector(districtName: string, sectorName: string): string[] {
  const entry = findDistrictEntry(districtName);
  const sector = entry?.district.sectors?.find((s) => s.name === sectorName);
  return [...(sector?.cells ?? [])].sort((a, b) => a.localeCompare(b));
}

export function getProvinceNames(): string[] {
  return rwandaProvinces.map((p) => p.name);
}

export function getDistrictNamesForProvince(provinceName: string): string[] {
  const province = rwandaProvinces.find((p) => p.name === provinceName);
  return (province?.districts ?? []).map((d) => d.name).sort((a, b) => a.localeCompare(b));
}
