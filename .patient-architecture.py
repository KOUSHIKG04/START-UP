from pathlib import Path
import re, json, os

root = Path('apps/patient-mobile').resolve()
src = root / 'src'
mapping = {}
def move(old, new):
    mapping[src / old] = src / new

screens = {
    'home/HomeScreen': 'home/HomeScreen',
    'find-doctor/FindDoctorScreen': 'doctors/DoctorSearchScreen',
    'doctor-results/DoctorResultsScreen': 'doctors/DoctorResultsScreen',
    'doctor-profile/DoctorProfileScreen': 'doctors/DoctorProfileScreen',
    'appointments/AppointmentsScreen': 'appointments/AppointmentsScreen',
    'booking-status/BookingStatusScreen': 'appointments/BookingStatusScreen',
    'visit-session/VisitSessionScreen': 'consultations/VisitSessionScreen',
    'ambulance/AmbulanceBookingScreen': 'ambulance/AmbulanceBookingScreen',
    'sos/SosEmergencyScreen': 'sos/SosEmergencyScreen',
    'prescription/PrescriptionScreen': 'prescriptions/PrescriptionScreen',
    'medicines/MedicinesScreen': 'medicines/MedicinesScreen',
    'records/RecordsScreen': 'records/RecordsScreen',
    'profile/ProfileScreen': 'profile/ProfileScreen',
}
for old, new in screens.items():
    domain, name = new.split('/')
    move('screens/' + old + '.tsx', f'features/{domain}/screens/{name}.tsx')
for name, domain in {
    'AmbulanceBanner': 'home', 'PopularServices': 'home',
    'UpcomingAppointmentCard': 'appointments', 'BookingCard': 'appointments',
    'AppointmentDetailsCard': 'appointments', 'DoctorCard': 'doctors',
    'FeedbackBottomSheet': 'consultations',
}.items():
    move(f'components/{name}.tsx', f'features/{domain}/components/{name}.tsx')
move('screens/types.ts', 'types/screen.ts')
for old, new in {
    'HomeActions.tsx': 'home/data/homeActions.tsx',
    'appointments.ts': 'appointments/data/mockAppointments.ts',
    'consultationFlow.ts': 'appointments/utils/consultationFlow.ts',
    'appointmentParams.ts': 'appointments/utils/appointmentParams.ts',
    'ambulanceFlow.ts': 'ambulance/utils/ambulanceFlow.ts',
    'prescription.ts': 'prescriptions/data/mockPrescription.ts',
}.items():
    move('utils/' + old, 'features/' + new)
for name in ('login', 'onboarding'):
    move(f'app/{name}.tsx', f'app/(auth)/{name}.tsx')
move('app/(tabs)/_layout.tsx', 'app/(app)/(tabs)/_layout.tsx')
move('app/(tabs)/index.tsx', 'app/(app)/(tabs)/index.tsx')
for name in ('appointments', 'records', 'profile'):
    move(f'app/(tabs)/{name}/index.tsx', f'app/(app)/(tabs)/{name}.tsx')
for old, new in {
    'find-doctor': 'doctor/search.tsx', 'doctor-results': 'doctor/results.tsx',
    'doctor-profile': 'doctor/[id].tsx', 'booking-status': 'booking/[id].tsx',
    'visit-session': 'visit/[id].tsx', 'ambulance': 'ambulance.tsx',
    'medicines': 'medicines.tsx', 'prescription': 'prescription.tsx', 'sos': 'sos.tsx',
}.items():
    move(f'app/{old}/index.tsx', 'app/(app)/' + new)

texts = {p: p.read_text(encoding='utf-8') for p in src.rglob('*') if p.suffix in ('.ts', '.tsx')}
def resolve_file(path):
    for candidate in (path, Path(str(path)+'.ts'), Path(str(path)+'.tsx'), path/'index.ts', path/'index.tsx'):
        if candidate.is_file(): return candidate.resolve()
    raise RuntimeError(f'Unresolved relative dependency: {path}')

for old, content in texts.items():
    new = mapping.get(old, old)
    def rewrite(match):
        prefix, quote, spec = match.groups()
        target = resolve_file((old.parent / spec).resolve())
        destination = mapping.get(target, target)
        if prefix.startswith('require'):
            specifier = os.path.relpath(destination, new.parent).replace('\\', '/')
            if not specifier.startswith('.'): specifier = './' + specifier
        elif destination.is_relative_to(src):
            specifier = '@/' + destination.relative_to(src).with_suffix('').as_posix()
        else:
            specifier = os.path.relpath(destination, new.parent).replace('\\', '/')
            if not specifier.startswith('.'): specifier = './' + specifier
        return prefix + quote + specifier + quote
    content = re.sub(r'(\bfrom\s+|\brequire\(\s*)([\"\'])(\.[^\"\']+)\2', rewrite, content)
    for before, after in {
        '/find-doctor': '/doctor/search', '/doctor-results': '/doctor/results',
        '/doctor-profile': '/doctor/[id]', '/booking-status': '/booking/[id]',
        '/visit-session': '/visit/[id]',
    }.items():
        content = content.replace('"'+before+'"', '"'+after+'"')
    content = content.replace('FindDoctorScreen', 'DoctorSearchScreen')
    # No stale tab route names after flattening the files.
    if new.name == '_layout.tsx' and '(tabs)' in new.parts:
        for name in ('appointments', 'records', 'profile'):
            content = content.replace(f'name="{name}/index"', f'name="{name}"')
        content = content.replace('import { StatusBar } from "expo-status-bar";\n', '')
        content = content.replace('\n      <StatusBar style="light" />', '')
    new.parent.mkdir(parents=True, exist_ok=True)
    new.write_text(content, encoding='utf-8')
for old, new in mapping.items():
    if old != new: old.unlink()
# Only remove verified empty directories inside this app's source directory.
for folder in sorted(src.rglob('*'), key=lambda p: len(p.parts), reverse=True):
    if folder.is_dir() and not any(folder.iterdir()):
        assert folder.resolve().is_relative_to(src)
        folder.rmdir()

config_path = root / 'tsconfig.json'
config = json.loads(config_path.read_text())
config['compilerOptions']['paths']['@/*'] = ['./src/*']
config_path.write_text(json.dumps(config, indent=2) + '\n')
print(f'Relocated {len(mapping)} files; rewrote local imports and asset paths.')
