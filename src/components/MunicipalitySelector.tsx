import React from 'react';
import { fetchMunicipalities } from '../services/taxService';

interface MunicipalitySelectorProps {
  id?: string;
  selectedMunicipalityCode?: string;
  selectedMunicipalityName?: string;
  onMunicipalityChange: (code: string, name: string) => void;
  disabled?: boolean;
}

export function MunicipalitySelector({
  id,
  selectedMunicipalityCode,
  onMunicipalityChange,
  disabled = false,
}: MunicipalitySelectorProps) {
  // Get municipalities from static data (no loading needed)
  const municipalities = fetchMunicipalities();

  const handleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const selectedCode = e.target.value;
    if (selectedCode) {
      const municipality = municipalities.find((m) => m.kod === selectedCode);
      if (municipality) {
        onMunicipalityChange(municipality.kod, municipality.namn);
      }
    }
  };

  return (
    <div className="relative">
      <select
        id={id}
        value={selectedMunicipalityCode || ''}
        onChange={handleChange}
        disabled={disabled}
        className="field"
      >
        <option value="">Select municipality</option>
        {municipalities.map((municipality) => (
          <option key={municipality.kod} value={municipality.kod}>
            {municipality.namn}
          </option>
        ))}
      </select>
    </div>
  );
}
