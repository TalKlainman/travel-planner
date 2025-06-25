import "@testing-library/jest-dom";

// Mock window.matchMedia
Object.defineProperty(window, "matchMedia", {
  writable: true,
  value: jest.fn().mockImplementation((query) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: jest.fn(),
    removeListener: jest.fn(),
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    dispatchEvent: jest.fn(),
  })),
});

// Mock IntersectionObserver
global.IntersectionObserver = class IntersectionObserver {
  constructor() {}
  observe() {
    return null;
  }
  unobserve() {
    return null;
  }
  disconnect() {
    return null;
  }
};

// Mock ResizeObserver
global.ResizeObserver = class ResizeObserver {
  constructor() {}
  observe() {
    return null;
  }
  unobserve() {
    return null;
  }
  disconnect() {
    return null;
  }
};

// Mock axios
jest.mock("axios", () => ({
  create: jest.fn(() => ({
    get: jest.fn(),
    post: jest.fn(),
    put: jest.fn(),
    delete: jest.fn(),
    interceptors: {
      request: {
        use: jest.fn(),
        eject: jest.fn(),
      },
      response: {
        use: jest.fn(),
        eject: jest.fn(),
      },
    },
  })),
  get: jest.fn(),
  post: jest.fn(),
  put: jest.fn(),
  delete: jest.fn(),
}));

// Mock date-fns
jest.mock("date-fns", () => ({
  format: jest.fn((date, formatStr) => "2024-01-01"),
  parseISO: jest.fn((date) => new Date()),
  addDays: jest.fn((date, amount) => new Date()),
  startOfDay: jest.fn((date) => new Date()),
  endOfDay: jest.fn((date) => new Date()),
  isValid: jest.fn(() => true),
}));

// Mock MUI date pickers
jest.mock("@mui/x-date-pickers/AdapterDateFns", () => ({
  AdapterDateFns: class AdapterDateFns {
    constructor() {
      this.date = jest.fn();
      this.parse = jest.fn();
      this.format = jest.fn();
      this.isValid = jest.fn();
    }
  },
}));

jest.mock("@mui/x-date-pickers/DatePicker", () => ({
  DatePicker: ({ children, ...props }) => (
    <div data-testid="date-picker">{children}</div>
  ),
}));

jest.mock("@mui/x-date-pickers/LocalizationProvider", () => ({
  LocalizationProvider: ({ children }) => <div>{children}</div>,
}));

// Mock lucide-react icons
jest.mock("lucide-react", () => ({
  Save: () => <div>Save Icon</div>,
  X: () => <div>X Icon</div>,
  Calendar: () => <div>Calendar Icon</div>,
  MapPin: () => <div>MapPin Icon</div>,
  DollarSign: () => <div>DollarSign Icon</div>,
  PlusCircle: () => <div>PlusCircle Icon</div>,
  Trash2: () => <div>Trash2 Icon</div>,
  Edit: () => <div>Edit Icon</div>,
  MoreVertical: () => <div>MoreVertical Icon</div>,
  ChevronDown: () => <div>ChevronDown Icon</div>,
  Search: () => <div>Search Icon</div>,
  Filter: () => <div>Filter Icon</div>,
  Users: () => <div>Users Icon</div>,
  UserPlus: () => <div>UserPlus Icon</div>,
}));
