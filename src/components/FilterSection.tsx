import React from 'react';

interface FilterOption {
  label: string;
  value: string;
}

interface FilterSectionProps {
  typeOptions: FilterOption[];
  regionOptions: FilterOption[];
  yearOptions: FilterOption[];
  selectedType: string;
  selectedRegion: string;
  selectedYear: string;
  onFilterChange: (filters: { type?: string; region?: string; year?: string }) => void;
}

function FilterSection({ 
  typeOptions, 
  regionOptions, 
  yearOptions, 
  selectedType, 
  selectedRegion, 
  selectedYear, 
  onFilterChange 
}: FilterSectionProps) {
  return (
    <div className='glass-card p-4 rounded-lg mb-6'>
      <div className='grid grid-cols-1 md:grid-cols-3 gap-4'>
        {/* 类型筛选 */}
        <div>
          <label className='block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2'>
            类型
          </label>
          <select
            value={selectedType}
            onChange={(e) => onFilterChange({ type: e.target.value })}
            className='w-full p-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500'
          >
            {typeOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>

        {/* 地区筛选 */}
        <div>
          <label className='block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2'>
            地区
          </label>
          <select
            value={selectedRegion}
            onChange={(e) => onFilterChange({ region: e.target.value })}
            className='w-full p-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500'
          >
            {regionOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>

        {/* 年份筛选 */}
        {yearOptions.length > 0 && (
          <div>
            <label className='block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2'>
              年份
            </label>
            <select
              value={selectedYear}
              onChange={(e) => onFilterChange({ year: e.target.value })}
              className='w-full p-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500'
            >
              {yearOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>
    </div>
  );
}

export default FilterSection;