from pathlib import Path
import re

src = Path('apps/patient-mobile/src').resolve()
files = list(src.rglob('*.ts')) + list(src.rglob('*.tsx'))
for p in files:
    text = p.read_text(encoding='utf-8')
    text = re.sub(r'("/[^"]*") as unknown as Href', r'\1', text)
    text = text.replace('} as unknown as Href', '} satisfies Href')
    # Keep type-only imports only where they are actually used.
    if 'Href' not in re.sub(r'import.*?;', '', text, flags=re.S):
        text = text.replace(', type Href', '')
    p.write_text(text, encoding='utf-8', newline='\n')

p = src / 'features/doctors/screens/DoctorResultsScreen.tsx'
text = p.read_text()
imports = 'import type { DoctorResult } from "@/features/doctors/types";\nimport { doctors } from "@/features/doctors/data/mockDoctors";\n'
while imports in text:
    text = text.replace(imports, '')
text = imports + text.lstrip()
p.write_text(text, encoding='utf-8', newline='\n')

missing = []
for p in files:
    text = p.read_text(encoding='utf-8')
    for spec in re.findall(r'(?:\bfrom\s+|\brequire\(\s*)["\']([^"\']+)["\']', text):
        if spec.startswith('@/'):
            target = src/spec[2:]
        elif spec.startswith('.'):
            target = p.parent/spec
        else:
            continue
        candidates = (target, Path(str(target)+'.ts'), Path(str(target)+'.tsx'), target/'index.ts', target/'index.tsx')
        if not any(c.is_file() for c in candidates): missing.append((str(p.relative_to(src)), spec))
if missing: raise RuntimeError(f'Missing imports/assets: {missing}')

print(f'All local imports and asset references resolve across {len(files)} source files.')
