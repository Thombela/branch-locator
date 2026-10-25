import { AnimatePresence, motion } from 'motion/react';
import { LoaderCircle, LocateFixed, MapPin, Navigation, Search, X } from 'lucide-react';
import { useId, useRef, useState, type KeyboardEvent } from 'react';
import { usePlaceSearch } from '@/api/hooks';
import type { Place } from '@/api/schemas';
import { SPRING_SNAPPY } from '@/lib/motion';
import styles from './SearchBox.module.css';

interface SearchBoxProps {
  onSelectPlace: (place: Place) => void;
  onLocate: () => void;
  locating: boolean;
  usingLocation: boolean;
}

/**
 * Place search using the ARIA combobox pattern: arrow keys move through suggestions, Enter
 * picks one, and Escape closes the list, then clears the text.
 */
export function SearchBox({ onSelectPlace, onLocate, locating, usingLocation }: SearchBoxProps) {
  const id = useId();
  const listId = `${id}-list`;
  const inputRef = useRef<HTMLInputElement>(null);
  const [text, setText] = useState('');
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);
  const search = usePlaceSearch(text);

  const places = text.trim().length >= 2 ? (search.data?.places ?? []) : [];
  const showList =
    open &&
    text.trim().length >= 2 &&
    (places.length > 0 || (search.isFetched && !search.isFetching));

  const choose = (place: Place) => {
    setText(place.name);
    setOpen(false);
    setActive(-1);
    onSelectPlace(place);
    inputRef.current?.blur();
  };

  const onKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      setOpen(true);
      setActive((i) => Math.min(i + 1, places.length - 1));
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      setActive((i) => Math.max(i - 1, 0));
    } else if (event.key === 'Enter') {
      const place = places[active] ?? places[0];
      if (place && showList) {
        event.preventDefault();
        choose(place);
      }
    } else if (event.key === 'Escape') {
      if (showList) setOpen(false);
      else setText('');
    }
  };

  return (
    <div className={styles.root}>
      <div className={styles.field}>
        <Search size={17} aria-hidden="true" />
        <input
          ref={inputRef}
          type="search"
          className={styles.input}
          placeholder="Search a suburb or city"
          role="combobox"
          aria-label="Search for a place"
          aria-expanded={showList}
          aria-controls={listId}
          aria-autocomplete="list"
          aria-activedescendant={showList && active >= 0 ? `${id}-option-${active}` : undefined}
          autoComplete="off"
          enterKeyHint="search"
          value={text}
          onChange={(event) => {
            setText(event.target.value);
            setOpen(true);
            setActive(-1);
          }}
          onFocus={() => setOpen(true)}
          onBlur={() => setOpen(false)}
          onKeyDown={onKeyDown}
        />
        {search.isFetching && text.trim().length >= 2 && (
          <LoaderCircle className={styles.spin} size={16} aria-hidden="true" />
        )}
        {text && (
          <button
            type="button"
            className={styles.clear}
            aria-label="Clear search"
            title="Clear search"
            onMouseDown={(event) => event.preventDefault()}
            onClick={() => {
              setText('');
              inputRef.current?.focus();
            }}
          >
            <X size={13} strokeWidth={3} aria-hidden="true" />
          </button>
        )}
      </div>
      <button
        type="button"
        className={styles.locate}
        onClick={onLocate}
        data-active={usingLocation}
        aria-label={locating ? 'Finding your location' : 'Use my location'}
        title={locating ? 'Finding your location' : 'Use my location'}
        aria-pressed={usingLocation}
        disabled={locating}
      >
        {locating ? (
          <LoaderCircle className={styles.spin} size={20} aria-hidden="true" />
        ) : usingLocation ? (
          <Navigation size={19} aria-hidden="true" />
        ) : (
          <LocateFixed size={20} aria-hidden="true" />
        )}
      </button>

      <AnimatePresence>
        {showList && (
          <motion.ul
            id={listId}
            role="listbox"
            aria-label="Places"
            className={styles.listbox}
            initial={{ opacity: 0, scale: 0.97, y: -4 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.97, y: -4, transition: { duration: 0.12 } }}
            transition={SPRING_SNAPPY}
          >
            {places.length === 0 ? (
              <li className={styles.empty} role="presentation">
                No places match “{text.trim()}”.
              </li>
            ) : (
              places.map((place, index) => (
                <li
                  key={place.id}
                  id={`${id}-option-${index}`}
                  role="option"
                  aria-selected={index === active}
                  className={styles.option}
                  // Pick on press so the input's blur doesn't close the list first.
                  onMouseDown={(event) => {
                    event.preventDefault();
                    choose(place);
                  }}
                  onMouseEnter={() => setActive(index)}
                >
                  <span className={styles.optionIcon} aria-hidden="true">
                    <MapPin size={15} />
                  </span>
                  <span className={styles.optionText}>
                    <span className={styles.optionName}>{place.name}</span>
                    <span className={styles.optionDescription}>{place.description}</span>
                  </span>
                </li>
              ))
            )}
          </motion.ul>
        )}
      </AnimatePresence>
    </div>
  );
}
