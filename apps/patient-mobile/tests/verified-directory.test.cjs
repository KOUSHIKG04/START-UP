const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');
function load(file, mocks = {}) {
  const exports = {};
  vm.runInNewContext(ts.transpileModule(fs.readFileSync(path.resolve(__dirname, file), 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX, target: ts.ScriptTarget.ES2022 },
  }).outputText, { exports, require: name => mocks[name], Intl, setTimeout, clearTimeout });
  return exports;
}
test('missing fee is not displayed as free', () => {
  const { formatConsultationFee } = load('../src/features/doctors/utils/doctorDisplay.ts', { '@startup/contracts': {} });
  assert.equal(formatConsultationFee(null, 'INR'), 'Fee not published');
  assert.equal(formatConsultationFee('0', 'INR'), '₹0');
  assert.equal(formatConsultationFee('25000', 'INR'), '₹250');
});
test('verified practice without a service remains in clinic results only', () => {
  const { uniqueDoctorPractices } = load('../src/features/doctors/utils/doctorSearch.ts');
  const row = { practice_id: 'practice', doctor_id: 'doctor', service_code: 'clinic-unpublished', practice_service_id: null };
  assert.equal(uniqueDoctorPractices([row], 'clinic').length, 1);
  assert.equal(uniqueDoctorPractices([row], 'online').length, 0);
  assert.equal(uniqueDoctorPractices([row], 'home').length, 0);
});
test('multiple associations produce one card with a real fee regardless of row order', () => {
  const { uniqueDoctorPractices } = load('../src/features/doctors/utils/doctorSearch.ts');
  const unpublished = { doctor_id: 'piddi', practice_id: 'a', service_code: 'clinic-unpublished', fee_minor: null, has_available_slots: false, distance_meters: 10 };
  const published = { ...unpublished, practice_id: 'b', service_code: 'clinic-service', fee_minor: '100000', distance_meters: 100 };
  for (const rows of [[unpublished, published], [published, unpublished]]) {
    const result = uniqueDoctorPractices(rows, 'clinic');
    assert.equal(result.length, 1);
    assert.equal(result[0].practice_id, 'b');
    assert.equal(result[0].fee_minor, '100000');
  }
});
test('available practice wins and separate doctors with the same name remain separate', () => {
  const { uniqueDoctorPractices } = load('../src/features/doctors/utils/doctorSearch.ts');
  const base = { doctor_id: 'one', doctor_name: 'Same name', practice_id: 'a', service_code: 'clinic-service', fee_minor: '10000', has_available_slots: false, distance_meters: 10 };
  const available = { ...base, practice_id: 'b', has_available_slots: true, distance_meters: 500 };
  const other = { ...base, doctor_id: 'two', practice_id: 'c' };
  const result = uniqueDoctorPractices([base, available, other], 'clinic');
  assert.equal(result.length, 2);
  assert.equal(result.find(row => row.doctor_id === 'one').practice_id, 'b');
});
test('earliest available location wins, then nearest location for equal times', () => {
  const { uniqueDoctorPractices } = load('../src/features/doctors/utils/doctorSearch.ts');
  const later = { doctor_id: 'one', practice_id: 'a', service_code: 'clinic-service', fee_minor: '10000', has_available_slots: true, next_available_at: '2026-10-15T12:00:00Z', distance_meters: 10 };
  const earlier = { ...later, practice_id: 'b', next_available_at: '2026-10-15T10:00:00Z', distance_meters: 500 };
  const nearest = { ...earlier, practice_id: 'c', distance_meters: 100 };
  assert.equal(uniqueDoctorPractices([later, earlier, nearest], 'clinic')[0].practice_id, 'c');
});
test('availability text uses the practice timezone and keeps the facility name', () => {
  const { practiceAvailabilityLabel } = load('../src/features/doctors/utils/doctorDisplay.ts', { '@startup/contracts': {} });
  const practice = { has_available_slots: true, next_available_at: '2026-10-15T13:00:00Z', timezone: 'Asia/Kolkata', facility_name: 'San Hospital' };
  const text = practiceAvailabilityLabel(practice, true, new Date('2026-10-15T12:00:00Z'));
  assert.match(text, /Today, 6:30.*San Hospital/);
  assert.equal(practiceAvailabilityLabel({ ...practice, has_available_slots: false }), 'No appointments available · San Hospital');
});
test('doctor card omits appointment availability and still opens the profile', () => {
  const jsx = (type, props) => ({ type, props });
  const { default: DoctorCard } = load('../src/features/doctors/components/DoctorCard.tsx', {
    react: { useRef: value => ({ current: value }) },
    'react/jsx-runtime': { jsx, jsxs: jsx },
    'react-native': { View: 'View', StyleSheet: { create: value => value } },
    'lucide-react-native': { Briefcase: 'Briefcase', UserRound: 'UserRound' },
    '@startup/design-tokens': { colors: { patient: {} }, fontFamilies: {}, radius: {} },
    '@startup/mobile-ui': { AppText: 'Text', Card: 'Card' },
  });
  let opened = false;
  const card = DoctorCard({ name: 'Doctor-02', qualification: 'MBBS', specialty: 'General Physician', experience: '15 Years', onPress: () => { opened = true; } });
  assert.doesNotMatch(JSON.stringify(card), /No appointments available/);
  card.props.onPress();
  assert.equal(opened, true);
});

test('switching locations resets slot state and confirms the selected location and fee', async () => {
  const state = []; let cursor = 0; const alerts = [], bookings = [], requests = [];
  let bookingPending = false;
  const jsx = (type, props, key) => ({ type, props: props ?? {}, key });
  const locations = ['a', 'b'].map((id, index) => ({ practice_id: id, practice_service_id: `service-${id}`, doctor_name: 'Doctor', service_code: 'clinic-service', service_name: 'Clinic', facility_name: `Clinic ${id}`, address: `Address ${id}`, fee_minor: String((index + 1) * 10000), currency: 'INR', specialties: [], languages: [], experience_years: 5, online_enabled: false }));
  const slots = id => [{ practice_id: id, practice_service_id: `service-${id}`, service_mode: 'clinic', window_id: `window-${id}`, starts_at: '2026-10-16T10:00:00Z', timezone: 'Asia/Kolkata', fee_minor: id === 'a' ? '10000' : '20000', currency: 'INR' }];
  const mocks = {
    react: {
      useState: initial => { const index = cursor++; if (!(index in state)) state[index] = typeof initial === 'function' ? initial() : initial; return [state[index], next => { state[index] = typeof next === 'function' ? next(state[index]) : next; }]; },
      useEffect: () => {}, useCallback: fn => fn,
    },
    'react/jsx-runtime': { jsx, jsxs: jsx, Fragment: 'Fragment' },
    'react-native': { View: 'View', Pressable: 'Pressable', Alert: { alert: (...args) => alerts.push(args) }, StyleSheet: { create: value => value } },
    'expo-router': { router: { back: () => {} }, useFocusEffect: () => {} },
    'expo-crypto': { randomUUID: () => 'booking-key' }, 'expo-haptics': {}, 'expo-location': {},
    '@tanstack/react-query': {
      useQueryClient: () => ({}),
      useQuery: options => {
        requests.push(options.queryKey);
        const kind = options.queryKey[0];
        return { data: kind === 'public-practice' ? locations : kind === 'clinic-slots' ? slots(options.queryKey[1]) : kind === 'my-family-profiles' ? [] : undefined };
      },
      useMutation: options => ({ isPending: bookingPending, mutate: args => { bookingPending = true; return options.mutationFn(args); } }),
    },
    '@startup/data-access': { bookClinicAppointment: async (_client, args) => { bookings.push(args); } },
    '@startup/design-tokens': { colors: { patient: {} }, fontFamilies: {}, spacing: { lg: 16 } },
    '@startup/mobile-ui': { AppText: 'Text', Button: 'Button', ModalSurface: 'Modal', FadedScrollView: 'Scroll', Header: 'Header', Skeleton: 'Skeleton', useToast: () => ({ showToast: () => {} }), useToastFeedback: () => {} },
    '../components/DoctorCard': { default: 'DoctorCard' },
    '../components/index': { AboutDoctor: 'AboutDoctor', BookSlots: 'BookSlots', ProfileTabs: 'Tabs', HomeVisitAddress: 'Address', OnlineConsultation: 'Online' },
    '../../appointments/utils/consultationFlow': { consultationFlows: { 'Clinic Visit': {} } },
    '../../../services/supabase': { supabase: {}, useMobileSession: () => ({ profile: { patient_id: 'patient' } }) },
    '../utils/doctorDisplay': { formatConsultationFee: minor => `₹${Number(minor) / 100}`, practiceAvailabilityLabel: () => 'Available' },
    '../../locations/locationDisplay': {},
  };
  const { DoctorProfileScreen } = load('../src/features/doctors/screens/DoctorProfileScreen.tsx', mocks);
  const render = () => {
    cursor = 0; const nodes = [];
    const walk = node => { if (Array.isArray(node)) return node.forEach(walk); if (!node || typeof node !== 'object') return; nodes.push(node); walk(node.props?.children); };
    walk(DoctorProfileScreen({ practiceId: 'a', serviceId: 'service-a', consultationType: 'Clinic Visit' }));
    return nodes;
  };
  render().find(node => node.type === 'Tabs').props.onTabChange('slots');
  let nodes = render();
  assert.equal(nodes.find(node => node.type === 'BookSlots').key, 'a:clinic');
  nodes.filter(node => node.props.accessibilityRole === 'radio')[1].props.onPress();
  nodes = render();
  const booking = nodes.find(node => node.type === 'BookSlots');
  assert.equal(booking.key, 'b:clinic');
  assert.equal(booking.props.slots[0].window_id, 'window-b');
  assert.equal(requests.at(-1)[0], 'practice-bio');
  booking.props.onBookAppointment({ patientId: 'patient', time: 'window-a', reason: 'Checkup' });
  assert.equal(alerts.length, 0);
  booking.props.onBookAppointment({ patientId: 'patient', time: 'window-b', reason: 'Checkup' });
  nodes=render();
  const modal=nodes.find(node=>node.type==='Modal');
  assert.equal(modal.props.visible,true);
  assert.match(JSON.stringify(modal), /Clinic b/);
  assert.match(JSON.stringify(modal), /Address b/);
  assert.match(JSON.stringify(modal), /₹200/);
  assert.equal(alerts.length,0);
  assert.equal(bookings.length, 0);
  assert.equal(nodes.find(node => node.type === 'BookSlots').props.busy, true);
  assert.equal(nodes.find(node => node.type === 'BookSlots').props.openingConfirmation, true);
  assert.equal(nodes.find(node => node.props.label === 'Confirm booking').props.loading, false);
  modal.props.onShow();
  nodes = render();
  assert.equal(nodes.find(node => node.type === 'BookSlots').props.openingConfirmation, false);
  await nodes.find(node=>node.type==='Button'&&node.props.label==='Confirm booking').props.onPress();
  assert.equal(bookings[0].practiceServiceId, 'service-b');
  assert.equal(bookings[0].windowId, 'window-b');
  nodes = render();
  assert.equal(nodes.find(node => node.props.label === 'Confirm booking').props.loading, true);
  assert.equal(nodes.find(node => node.props.label === 'Cancel').props.disabled, true);
  assert.equal(nodes.find(node => node.type === 'BookSlots').props.busy, true);
  assert.equal(nodes.find(node => node.type === 'BookSlots').props.openingConfirmation, false);
});

test('Book Slots automatically selects the earliest generated date after loading and allows booking its time', () => {
  const state = []; let cursor = 0; let effects = []; const bookings = [];
  const jsx = (type, props, key) => ({ type, props: props ?? {}, key });
  const react = {
    useState: initial => { const index = cursor++; if (!(index in state)) state[index] = typeof initial === 'function' ? initial() : initial; return [state[index], next => { state[index] = typeof next === 'function' ? next(state[index]) : next; }]; },
    useRef: initial => { const index = cursor++; if (!(index in state)) state[index] = { current: initial }; return state[index]; },
    useMemo: fn => fn(), useEffect: fn => effects.push(fn),
  };
  const { BookSlots } = load('../src/features/doctors/components/BookSlots.tsx', {
    react, 'react/jsx-runtime': { jsx, jsxs: jsx },
    'react-native': { ScrollView: 'ScrollView', View: 'View', StyleSheet: { create: styles => styles } },
    'lucide-react-native': {},
    '@startup/contracts': { formatDisplayDate: value => value },
    '@startup/design-tokens': { colors: { patient: {} }, fontFamilies: {}, radius: {} },
    '@startup/mobile-ui': { AppText: 'Text', Card: 'Card', Button: 'Button', Chip: 'Chip', FadedScrollView: 'Scroll', Input: 'Input', Loader: 'Loader', TimeSlot: 'TimeSlot', useToast: () => ({ showToast: () => {} }), useToastFeedback: () => {} },
    '../utils/doctorProfileConstants': { months: Array.from({ length: 12 }, (_, i) => ({ name: String(i) })) },
    '../utils/doctorDisplay': { formatConsultationFee: minor => `₹${Number(minor) / 100}` },
  });
  const first = new Date(Date.now() + 2 * 86400000).toISOString();
  const later = new Date(Date.now() + 3 * 86400000).toISOString();
  const props = { slots: [], loading: true, consultationType: 'Clinic Visit', patientOptions: [{ id: 'patient', verified: true, label: 'Self' }], onBookAppointment: selection => bookings.push(selection), timeZone: 'Asia/Kolkata' };
  const render = () => {
    cursor = 0; effects = []; const nodes = [];
    const walk = node => { if (Array.isArray(node)) return node.forEach(walk); if (!node || typeof node !== 'object') return; nodes.push(node); walk(node.props?.children); };
    walk(BookSlots(props)); effects.forEach(fn => fn()); return nodes;
  };
  assert.equal(render().filter(node => node.type === 'TimeSlot').length, 0);
  props.loading = false;
  props.slots = [{ window_id: 'later', starts_at: later, fee_minor: '50000', currency: 'INR' }, { window_id: 'first', starts_at: first, fee_minor: '50000', currency: 'INR' }];
  render(); let nodes = render();
  const times = nodes.filter(node => node.type === 'TimeSlot');
  assert.equal(times.length, 1);
  assert.equal(times[0].key, 'first');
  const availability = nodes.find(node => node.props.children?.[1] === ' slots available');
  assert.equal(availability.props.children.length, 2);
  assert.equal(nodes.find(node => node.type === 'Button' && node.props.label === 'Book Appointment').props.disabled, true);
  times[0].props.onPress(); nodes = render();
  const book = nodes.find(node => node.type === 'Button' && node.props.label === 'Book Appointment');
  assert.equal(book.props.disabled, false);
  book.props.onPress();
  assert.equal(bookings[0].time, 'first');
  props.busy = true;
  const blocked = render().find(node => node.props.label === 'Book Appointment');
  assert.equal(blocked.props.disabled, true);
  assert.notEqual(blocked.props.loading, true);
  blocked.props.onPress();
  assert.equal(bookings.length, 1);
  props.openingConfirmation = true;
  assert.equal(render().find(node => node.props.label === 'Book Appointment').props.loading, true);
  props.openingConfirmation = false;
  props.busy = false;
  // A published schedule can change while this component stays mounted.
  props.slots = [{ window_id: 'replacement', starts_at: later, fee_minor: '50000', currency: 'INR' }];
  nodes = render();
  assert.equal(nodes.filter(node => node.type === 'TimeSlot')[0].key, 'replacement');
  assert.equal(nodes.find(node => node.type === 'Button' && node.props.label === 'Book Appointment').props.disabled, true);
  props.slots = []; render();
  props.slots = [{ window_id: 'fresh', starts_at: first, fee_minor: '50000', currency: 'INR' }];
  assert.equal(render().filter(node => node.type === 'TimeSlot')[0].key, 'fresh');
});
