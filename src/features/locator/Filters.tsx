import { Clock } from 'lucide-react';
import { useId } from 'react';
import { useFilterOptions } from '@/api/hooks';
import styles from './Filters.module.css';

export interface FilterState {
  openNow: boolean;
  services: string[];
  radiusKm: number;
}

interface FiltersProps {
  value: FilterState;
  onChange: (next: FilterState) => void;
}

/** One scrolling row of filters, with "Open now" first. */
export function Filters({ value, onChange }: FiltersProps) {
  const { data } = useFilterOptions();
  const radiusId = useId();
  const radiusOptions = data?.radiusOptionsKm ?? [5, 10, 25, 50];

  const toggleService = (id: string) =>
    onChange({
      ...value,
      services: value.services.includes(id)
        ? value.services.filter((s) => s !== id)
        : [...value.services, id],
    });

  return (
    <div className={styles.chips} role="group" aria-label="Filter branches">
      <button
        type="button"
        className={styles.chip}
        aria-pressed={value.openNow}
        onClick={() => onChange({ ...value, openNow: !value.openNow })}
      >
        <Clock size={14} aria-hidden="true" />
        Open now
      </button>
      <label className="visually-hidden" htmlFor={radiusId}>
        Search radius
      </label>
      <select
        id={radiusId}
        className={styles.select}
        value={value.radiusKm}
        onChange={(event) => onChange({ ...value, radiusKm: Number(event.target.value) })}
      >
        {radiusOptions.map((km) => (
          <option key={km} value={km}>
            Within {km} km
          </option>
        ))}
      </select>
      {data?.services.map((service) => (
        <button
          key={service.id}
          type="button"
          className={styles.chip}
          aria-pressed={value.services.includes(service.id)}
          onClick={() => toggleService(service.id)}
        >
          {service.label}
        </button>
      ))}
    </div>
  );
}
