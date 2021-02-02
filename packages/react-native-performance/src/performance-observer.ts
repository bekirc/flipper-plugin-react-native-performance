import { EntryType, PerformanceEntry } from "./performance-entry";

type ObserveOptionType1 = {
  entryTypes: EntryType[];
};

type ObserveOptionType2 = {
  type: EntryType;
  buffered?: boolean;
}

export class PerformanceObserverEntryList {
  entries: PerformanceEntry[];

  constructor(entries: PerformanceEntry[]) {
    this.entries = entries;
  }

  getEntries(): PerformanceEntry[] {
    return this.entries.slice(0);
  }

  getEntriesByType(type: EntryType): PerformanceEntry[] {
    return this.entries.filter(entry => entry.entryType === type);
  }

  getEntriesByName(name: string, type: EntryType): PerformanceEntry[] {
    return this.entries.filter(
      entry => entry.name === name && (!type || entry.entryType === type)
    );
  }
}

const SUPPORTED_ENTRY_TYPES = [
  'mark',
  'measure',
  'resource',
  'metric',
  'react-native-mark',
];

export const createPerformanceObserver = ({
  addEventListener,
  removeEventListener,
  getEntriesByType,
}) =>
  class PerformanceObserver {
    callback: (list: PerformanceObserverEntryList, observer: PerformanceObserver) => void;
    buffer: PerformanceEntry[];
    entryTypes: Set<EntryType>;
    timer?: number;

    constructor(callback: (list: PerformanceObserverEntryList, observer: PerformanceObserver) => void) {
      this.callback = callback;
      this.buffer = [];
      this.timer = null;
      this.entryTypes = new Set();
    }

    emitRecords = () => {
      this.callback(this.takeRecords(), this);
    };

    scheduleEmission() {
      if (this.timer === null) {
        this.timer = requestAnimationFrame(() => {
          this.timer = null;
          this.emitRecords();
        });
      }
    }

    receiveRecord = (entry: PerformanceEntry) => {
      if (this.entryTypes.has(entry.entryType)) {
        this.buffer.push(entry);
        this.scheduleEmission();
      }
    };

    observe(options: ObserveOptionType1): void;
    observe(options: ObserveOptionType2): void;

    observe(options: any) {
      if (!options || (!options.entryTypes && !options.type)) {
        throw new TypeError(
          "Failed to execute 'observe' on 'PerformanceObserver': An observe() call must include either entryTypes or type arguments."
        );
      }

      if (options.entryTypes) {
        this.entryTypes = new Set(options.entryTypes);
        this.buffer = [];
        if (options.buffered) {
          console.warn(
            'The PerformanceObserver does not support buffered flag with the entryTypes argument.'
          );
        }
      } else {
        this.entryTypes = new Set([options.type]);
        if (options.buffered) {
          this.buffer = getEntriesByType(options.type);
          this.scheduleEmission();
        }
      }

      this.entryTypes.forEach(entryType => {
        if (!SUPPORTED_ENTRY_TYPES.includes(entryType)) {
          console.warn(
            `The entry type '${entryType}' does not exist or isn't supported.`
          );
        }
      });

      addEventListener(this.receiveRecord);
    }

    disconnect(): void {
      removeEventListener(this.receiveRecord);
    }

    takeRecords(): PerformanceObserverEntryList {
      const entries = new PerformanceObserverEntryList(this.buffer);
      this.buffer = [];
      return entries;
    }
  };