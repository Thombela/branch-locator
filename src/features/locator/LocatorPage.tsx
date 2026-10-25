import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import { RotateCw, TriangleAlert } from 'lucide-react';
import { lazy, Suspense, useCallback, useState } from 'react';
import { useLocation, useNavigate, useSearchParams } from 'react-router';
import { useBranch, useBranchSearch, useFilterOptions, usePlace } from '@/api/hooks';
import type { BranchSummary, LatLng, Place } from '@/api/schemas';
import { ErrorState, LoadingRegion } from '@/components/States';
import { ThemeToggle } from '@/components/ThemeToggle';
import { hasActiveFilters, readFilters, writeFilters } from '@/domain/urlState';
import { GEOLOCATION_MESSAGES, useGeolocation } from '@/hooks/useGeolocation';
import { useMediaQuery } from '@/hooks/useMediaQuery';
import { FADE_REDUCED, SPRING_DEFAULT } from '@/lib/motion';
import { BranchDetail } from './BranchDetail';
import { BranchList, BranchListSkeleton } from './BranchList';
import { DetentSheet } from './DetentSheet';
import type { Detent } from './detents';
import { Filters, type FilterState } from './Filters';
import { SearchBox } from './SearchBox';
import styles from './LocatorPage.module.css';

// MapLibre is large: load it in parallel so search and the list are usable straight away.
const BranchMap = lazy(() =>
  import('@/features/map/BranchMap').then((m) => ({ default: m.BranchMap })),
);

const DEFAULT_PLACE_ID = 'pl_cape_town_cbd';
const FLOATING_SEARCH_HEIGHT = 72;

/** Where results are measured from. Only a searched place goes into the URL. */
type Origin =
  | { kind: 'place'; place: Place }
  | { kind: 'user'; location: LatLng; accuracyM: number }
  | { kind: 'area'; location: LatLng };

const originLocation = (origin: Origin) =>
  origin.kind === 'place' ? origin.place.location : origin.location;
const originLabel = (origin: Origin) =>
  origin.kind === 'place' ? origin.place.name : origin.kind === 'user' ? 'you' : 'this area';

export function LocatorPage() {
  const [params, setParams] = useSearchParams();
  const navigate = useNavigate();
  const location = useLocation();
  const desktop = useMediaQuery('(min-width: 56rem)');
  const reduceMotion = useReducedMotion() ?? false;

  const { data: options } = useFilterOptions();
  const filters = readFilters(params, options?.radiusOptionsKm);
  const selectedId = params.get('branch');
  const placeId = params.get('place') ?? DEFAULT_PLACE_ID;

  const [override, setOverride] = useState<Exclude<Origin, { kind: 'place' }> | null>(null);
  // Opened from a shared link to a branch with no place in the URL: search around that branch
  // until the customer picks somewhere else. Choosing a branch in the app doesn't move the origin.
  const [sharedBranchId] = useState(() => (params.get('place') ? null : params.get('branch')));
  const sharedBranch = useBranch(override ? null : sharedBranchId);
  const placeQuery = usePlace(override || sharedBranchId ? null : placeId);
  const origin: Origin | null =
    override ??
    (sharedBranchId
      ? sharedBranch.data
        ? { kind: 'area', location: sharedBranch.data.location }
        : null
      : placeQuery.data
        ? { kind: 'place', place: placeQuery.data }
        : null);

  const [highlightedId, setHighlightedId] = useState<string | null>(null);
  const [areaCenter, setAreaCenter] = useState<LatLng | null>(null);
  const [detent, setDetent] = useState<Detent>(selectedId ? 'half' : 'peek');
  const [sheetCoverage, setSheetCoverage] = useState(0);
  const geolocation = useGeolocation();

  const search = useBranchSearch(
    origin
      ? {
          origin: originLocation(origin),
          radiusKm: filters.radiusKm,
          services: filters.services,
          openNow: filters.openNow,
        }
      : null,
  );
  const results = origin ? search.data : undefined;
  const selectedSummary = results?.branches.find((b) => b.id === selectedId);
  const selectedDetail = useBranch(selectedId);

  const selectedLocation = selectedSummary?.location ?? selectedDetail.data?.location ?? null;

  const updateParams = (
    mutate: (next: URLSearchParams) => URLSearchParams | undefined,
    push = false,
  ) => {
    const next = new URLSearchParams(params);
    setParams(mutate(next) ?? next, {
      replace: !push,
      state: push ? { fromList: true } : undefined,
    });
  };

  const selectBranch = (id: string) => {
    if (id === selectedId) return;
    updateParams((next) => {
      next.set('branch', id);
      return next;
    }, !selectedId);
    if (!desktop && detent === 'peek') setDetent('half');
  };

  const closeBranch = () => {
    if ((location.state as { fromList?: boolean } | null)?.fromList) void navigate(-1);
    else
      updateParams((next) => {
        next.delete('branch');
        return next;
      });
  };

  const choosePlace = (place: Place) => {
    setOverride(null);
    geolocation.reset();
    updateParams((next) => {
      next.set('place', place.id);
      next.delete('branch');
      return next;
    });
    if (!desktop) setDetent('half');
  };

  const locate = async () => {
    const result = await geolocation.request();
    if (!result) return;
    setOverride({ kind: 'user', ...result });
    updateParams((next) => {
      next.delete('place');
      next.delete('branch');
      return next;
    });
    if (!desktop) setDetent('half');
  };

  const searchThisArea = () => {
    if (!areaCenter) return;
    setOverride({ kind: 'area', location: areaCenter });
    setAreaCenter(null);
    updateParams((next) => {
      next.delete('place');
      return next;
    });
  };

  const setFilters = (next: FilterState) => updateParams((p) => writeFilters(p, next));
  const clearFilters = () =>
    setFilters({ openNow: false, services: [], radiusKm: filters.radiusKm });
  const widen =
    filters.radiusKm < 50
      ? () => setFilters({ ...filters, radiusKm: filters.radiusKm < 25 ? 25 : 50 })
      : null;
  const onAreaChange = useCallback((center: LatLng | null) => setAreaCenter(center), []);

  const fitKey = origin
    ? `${JSON.stringify(originLocation(origin))}|${filters.radiusKm}|${filters.services.join()}|${String(filters.openNow)}`
    : '';

  const notice =
    geolocation.state.status === 'error' ? (
      <div className={styles.notice} role="alert">
        <TriangleAlert size={16} aria-hidden="true" />
        <span>{GEOLOCATION_MESSAGES[geolocation.state.problem]}</span>
        <button type="button" onClick={geolocation.reset}>
          Dismiss
        </button>
      </div>
    ) : null;

  const listView = !origin ? (
    placeQuery.error || sharedBranch.error ? (
      <ErrorState
        error={placeQuery.error ?? sharedBranch.error}
        onRetry={() => void (sharedBranchId ? sharedBranch.refetch() : placeQuery.refetch())}
        retrying={placeQuery.isFetching || sharedBranch.isFetching}
      />
    ) : (
      <LoadingRegion label="Finding branches">
        <BranchListSkeleton />
      </LoadingRegion>
    )
  ) : search.error && !results ? (
    <ErrorState
      error={search.error}
      onRetry={() => void search.refetch()}
      retrying={search.isFetching}
    />
  ) : !results ? (
    <LoadingRegion label="Finding branches">
      <BranchListSkeleton />
    </LoadingRegion>
  ) : (
    <BranchList
      branches={results.branches}
      total={results.total}
      originLabel={originLabel(origin)}
      radiusKm={filters.radiusKm}
      busy={search.isPlaceholderData}
      highlightedId={highlightedId}
      hasFilters={hasActiveFilters(filters)}
      onSelect={(branch: BranchSummary) => selectBranch(branch.id)}
      onHighlight={setHighlightedId}
      onClearFilters={clearFilters}
      onWiden={widen}
      showSummary={desktop}
    />
  );

  // List and detail slide like pages: the detail comes in from the right and leaves that way.
  const direction = selectedId ? 1 : -1;
  const views = (
    <AnimatePresence mode="wait" initial={false} custom={direction}>
      <motion.div
        key={selectedId ?? 'list'}
        className={styles.view}
        custom={direction}
        variants={{
          enter: (d: number) => (reduceMotion ? { opacity: 0 } : { opacity: 0, x: d * 32 }),
          center: { opacity: 1, x: 0 },
          // A quick exit keeps the stack feel without "popLayout", which injects a <style> tag the CSP forbids.
          exit: (d: number) =>
            reduceMotion
              ? { opacity: 0, transition: FADE_REDUCED }
              : { opacity: 0, x: d * -24, transition: { duration: 0.12, ease: 'easeIn' } },
        }}
        initial="enter"
        animate="center"
        exit="exit"
        transition={reduceMotion ? FADE_REDUCED : SPRING_DEFAULT}
      >
        {selectedId ? (
          <BranchDetail branchId={selectedId} summary={selectedSummary} onBack={closeBranch} />
        ) : (
          <div className={styles.panelInner}>
            {!desktop && <Filters value={filters} onChange={setFilters} />}
            {listView}
          </div>
        )}
      </motion.div>
    </AnimatePresence>
  );

  const searchBox = (
    <SearchBox
      onSelectPlace={choosePlace}
      onLocate={() => void locate()}
      locating={geolocation.state.status === 'locating'}
      usingLocation={origin?.kind === 'user'}
    />
  );

  return (
    <div className={styles.page}>
      <h1 className="visually-hidden">Find a branch</h1>
      <title>
        {selectedDetail.data ? `${selectedDetail.data.name} · Branch Locator` : 'Branch Locator'}
      </title>

      {desktop ? (
        <aside className={styles.panel} aria-label="Search and results">
          {searchBox}
          {notice}
          {!selectedId && <Filters value={filters} onChange={setFilters} />}
          {views}
        </aside>
      ) : (
        <div className={styles.floatingSearch}>
          {searchBox}
          <ThemeToggle className={styles.floatingToggle} />
        </div>
      )}

      <div className={styles.map}>
        {origin && (
          <Suspense fallback={null}>
            <BranchMap
              origin={originLocation(origin)}
              radiusKm={filters.radiusKm}
              branches={results?.branches ?? []}
              fitKey={results && !search.isPlaceholderData ? fitKey : null}
              selected={
                selectedId && selectedLocation
                  ? { id: selectedId, location: selectedLocation }
                  : null
              }
              highlightedId={highlightedId}
              user={
                origin.kind === 'user'
                  ? { location: origin.location, accuracyM: origin.accuracyM }
                  : null
              }
              insetTop={desktop ? 0 : FLOATING_SEARCH_HEIGHT}
              insetBottom={desktop ? 0 : sheetCoverage}
              onSelect={selectBranch}
              onHighlight={setHighlightedId}
              onAreaChange={onAreaChange}
            />
          </Suspense>
        )}
        <AnimatePresence>
          {areaCenter && (
            <motion.button
              type="button"
              className={styles.searchArea}
              onClick={searchThisArea}
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={reduceMotion ? FADE_REDUCED : SPRING_DEFAULT}
            >
              <RotateCw size={15} aria-hidden="true" />
              Search this area
            </motion.button>
          )}
        </AnimatePresence>
      </div>

      {!desktop && (
        <DetentSheet
          label="Branches"
          detent={detent}
          onDetentChange={setDetent}
          onCoverageChange={setSheetCoverage}
          header={
            <>
              <p className={styles.sheetTitle}>
                {selectedId ? 'Branch details' : 'Nearby branches'}
              </p>
              {!selectedId && results && origin && (
                <p className={styles.sheetSubtitle} aria-live="polite">
                  {results.total} within {filters.radiusKm} km of {originLabel(origin)}
                </p>
              )}
            </>
          }
        >
          {notice}
          {views}
        </DetentSheet>
      )}
    </div>
  );
}
