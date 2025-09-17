import React from 'react';
import { MapPin } from 'lucide-react';
import { fetchMunicipalities } from '../services/taxService';

interface MunicipalitySelectorProps {
  selectedMunicipalityCode?: string;
  selectedMunicipalityName?: string;
  onMunicipalityChange: (code: string, name: string) => void;
  disabled?: boolean;
}

export function MunicipalitySelector({
  selectedMunicipalityCode,
  selectedMunicipalityName,
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
        value={selectedMunicipalityCode || ''}
        onChange={handleChange}
        disabled={disabled}
        className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-50 disabled:text-gray-500"
      >
        <option value="">Select municipality...</option>
        {municipalities.map((municipality) => (
          <option key={municipality.kod} value={municipality.kod}>
            {municipality.namn}
          </option>
        ))}
      </select>
      <MapPin className="absolute right-8 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
      {selectedMunicipalityName && (
        <div className="mt-1 text-xs text-gray-500">
          Selected: {selectedMunicipalityName} ({selectedMunicipalityCode})
        </div>
      )}
    </div>
  );
}
