const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs'), path = require('node:path'), vm = require('node:vm'), ts = require('typescript');
const { z } = require('zod');
function load(file, mocks) {
  const exports = {};
  vm.runInNewContext(ts.transpileModule(fs.readFileSync(path.resolve(__dirname, file), 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX, target: ts.ScriptTarget.ES2022 },
  }).outputText, { exports, require: name => mocks[name] });
  return exports;
}
const schemas = load('../../../packages/contracts/src/clinical.ts', { zod: { z }, './validation': { uuidSchema: z.string().uuid() } });
const aid = '87b71030-d331-4c06-85a5-81dde98a8c38';
function flow({ initial = { vitals: [], diagnosis: null, prescription_issued: false, followup: null }, failIntake = false } = {}) {
  const states = [], pending = [], calls = []; let cursor = 0;
  const jsx = (type, props) => ({ type, props: props ?? {} });
  const react = {
    useState: initial => { const i = cursor++; if (!(i in states)) states[i] = typeof initial === 'function' ? initial() : initial; return [states[i], next => { states[i] = typeof next === 'function' ? next(states[i]) : next; }]; },
    useEffect: () => {},
  };
  const { ConsultationForm } = load('../src/features/clinic/components/ConsultationForm.tsx', {
    react, 'react/jsx-runtime': { jsx, jsxs: jsx }, 'react-native': { View: 'View', Text: 'Text', StyleSheet: { create: x => x } },
    '@tanstack/react-query': { useQuery: () => ({ data: initial }), useQueryClient: () => ({ invalidateQueries: async () => {} }),
      useMutation: options => ({ isPending: false, mutate: () => pending.push((async () => {
        try { const value = await options.mutationFn(); await options.onSuccess?.(value); } catch (error) { await options.onError?.(error); }
      })()) }) },
    '@startup/contracts': schemas,
    '@startup/data-access': {
      recordConsultationIntake: async (_client, value) => { schemas.consultationIntakeSchema.parse(value); calls.push(['intake', value]); if (failIntake) throw Error('Offline'); },
      issueConsultationPrescription: async (_client, value) => { schemas.issuePrescriptionSchema.parse(value); calls.push(['prescription', value]); },
      recommendConsultationFollowup: async (_client, value) => { schemas.recommendFollowupSchema.parse(value); calls.push(['followup', value]); },
    },
    '@startup/mobile-ui': { Button: 'Button', CalendarField: 'Calendar', Input: 'Input', useToastFeedback: () => {} },
    '../../../services/supabase': { supabase: {} },
    '../../../components/DoctorScreen': { DoctorScreen: 'Screen', Label: 'Label', Heading: 'Heading' },
  });
  function render() {
    cursor = 0; const nodes = [];
    const entry = ConsultationForm({ appointmentId: aid, patientName: 'Patient', timezone: 'Asia/Kolkata', completing: false,
      assessmentStep: jsx('Input', { label: 'Assessment' }) });
    function walk(node) { if (Array.isArray(node)) return node.forEach(walk); if (!node || typeof node !== 'object') return; nodes.push(node); walk(node.props?.children); }
    walk(entry.type(entry.props)); return nodes;
  }
  return { render, calls, finish: () => Promise.all(pending) };
}

test('vitals save together, each stage is separate, and assessment appears only after follow-up', async () => {
  const view = flow(); let nodes = view.render();
  assert.equal(nodes[0].props.title, 'Record vitals');
  assert.equal(nodes.filter(node => node.props.label === 'Save').length, 0);
  assert.equal(nodes.find(node => node.props.label === 'Medicine name'), undefined);
  assert.equal(nodes.find(node => node.props.label === 'Assessment'), undefined);
  nodes.find(node => node.props.label === 'Pulse (bpm)').props.onChangeText('72');
  nodes.find(node => node.props.label === 'Temperature (°C)').props.onChangeText('37');
  view.render().find(node => node.props.label === 'Save and continue').props.onPress(); await view.finish();
  assert.equal(view.calls.length, 1); assert.equal(view.calls[0][1].vitals.length, 2);
  nodes = view.render(); assert.equal(nodes[0].props.title, 'Prescription');
  assert.equal(nodes.find(node => node.props.label === 'Pulse (bpm)'), undefined);
  for (const [label, value] of [['Medicine name', 'Test medicine'], ['Strength', '1 mg'], ['Form', 'tablet'], ['Instructions', 'Test instructions']]) {
    nodes.find(node => node.props.label === label).props.onChangeText(value);
  }
  const start = nodes.find(node => node.props.label === 'Start date').props.minDate;
  nodes.find(node => node.props.label === 'Start date').props.onChange(start);
  view.render().find(node => node.props.label === 'End date').props.onChange(start);
  view.render().find(node => node.props.label === 'Add medicine to draft').props.onPress();
  view.render().find(node => node.props.label === 'Sign prescription and continue').props.onPress(); await view.finish();
  nodes = view.render(); assert.equal(nodes[0].props.title, 'Follow-up');
  assert.equal(nodes.find(node => node.props.label === 'Medicine name'), undefined);
  assert.equal(nodes.find(node => node.props.label === 'Assessment'), undefined);
  const followup = nodes.find(node => node.props.label === 'Follow-up date');
  assert.equal(followup.type, 'Calendar'); assert.ok(followup.props.minDate > start);
  followup.props.onChange(followup.props.minDate);
  nodes.find(node => node.props.label === 'Reason').props.onChangeText('Review symptoms');
  view.render().find(node => node.props.label === 'Save and continue').props.onPress(); await view.finish();
  nodes = view.render(); assert.equal(nodes[0].props.title, 'Sign assessment');
  assert.equal(nodes.find(node => node.props.label === 'Assessment').type, 'Input');
  assert.equal(view.calls[1][0], 'prescription'); assert.equal(view.calls[2][0], 'followup');
  nodes[0].props.onBackPress(); nodes = view.render();
  assert.equal(nodes[0].props.title, 'Follow-up'); assert.equal(nodes.find(node => node.props.label === 'Follow-up date').props.disabled, true);
});

test('failed intake keeps the values and stays on the vitals step', async () => {
  const view = flow({ failIntake: true });
  view.render().find(node => node.props.label === 'Pulse (bpm)').props.onChangeText('72');
  view.render().find(node => node.props.label === 'Save and continue').props.onPress(); await view.finish();
  const nodes = view.render(); assert.equal(nodes[0].props.title, 'Record vitals');
  assert.equal(nodes.find(node => node.props.label === 'Pulse (bpm)').props.value, '72');
});

test('reopened consultation resumes after an issued prescription without signing it again', () => {
  const view = flow({ initial: { vitals: [{ code: 'pulse_bpm', value: 72, unit: 'bpm' }], diagnosis: null, prescription_issued: true, followup: null } });
  let nodes = view.render(); assert.equal(nodes[0].props.title, 'Follow-up');
  nodes[0].props.onBackPress(); nodes = view.render();
  assert.equal(nodes[0].props.title, 'Prescription');
  assert.equal(nodes.find(node => node.props.label === 'Sign prescription and continue'), undefined);
  assert.equal(view.calls.length, 0);
});

test('shared calendar keeps local days and generates a complete leap-month grid', () => {
  const { parseCalendarDay, formatCalendarDay, calendarMonthDays } = load('../../../packages/mobile-ui/src/primitives/calendarDays.ts', {});
  assert.equal(formatCalendarDay(parseCalendarDay('2028-02-29')), '2028-02-29');
  assert.equal(parseCalendarDay('2027-02-29'), null);
  const days = calendarMonthDays(parseCalendarDay('2028-02-01'));
  assert.equal(days.length % 7, 0);
  assert.equal(days.filter(Boolean).length, 29);
  assert.equal(days.find(Boolean), '2028-02-01');
  assert.equal(days.filter(Boolean).at(-1), '2028-02-29');
});

