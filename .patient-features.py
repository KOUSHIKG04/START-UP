from pathlib import Path
import re

src = Path('apps/patient-mobile/src').resolve()
def read(path): return (src/path).read_text(encoding='utf-8')
def write(path, content):
    p = src/path
    p.parent.mkdir(parents=True, exist_ok=True)
    p.write_text(content, encoding='utf-8')
def take_style(content, names):
    chunks = []
    for name in names:
        pattern = r'^  ' + name + r': \{\n.*?^  \},\n'
        match = re.search(pattern, content, re.M|re.S)
        assert match, name
        chunks.append(match.group())
        content = content[:match.start()] + content[match.end():]
    return content, ''.join(chunks)

# Doctor discovery data and public feature types.
p = 'features/doctors/screens/DoctorResultsScreen.tsx'
s = read(p)
t = re.search(r'type DoctorResult = .*?\n};', s, re.S).group()
t = t.replace('type DoctorResult', 'export type DoctorResult').replace('  distanceKm:', '  id: string;\n  distanceKm:')
write('features/doctors/types.ts', 'import type { DoctorCardProps } from "./components/DoctorCard";\n\n'+t+'\n')
s = re.sub(r'type DoctorResult = .*?\n};\n\n', '', s, flags=re.S)
data = re.search(r'const doctors: DoctorResult\[\] = \[.*?\n\];', s, re.S).group()
data = data.replace('const doctors:', 'export const doctors:')
for i, name in enumerate(('Ananya Sharma', 'Mandira Rao', 'Sriram Reddy', 'Deepthi Nair'), 1):
    data = data.replace(f'    name: "Dr. {name}",', f'    id: "doctor-{i}",\n    name: "Dr. {name}",')
write('features/doctors/data/mockDoctors.ts', 'import type { DoctorResult } from "../types";\n\n'+data+'\n')
s = re.sub(r'const doctors: DoctorResult\[\] = \[.*?\n\];\n\n', '', s, flags=re.S)
s = s.replace('DoctorCard, { type DoctorCardProps }', 'DoctorCard')
s = s.replace('type DoctorFilter =', 'import type { DoctorResult } from "@/features/doctors/types";\nimport { doctors } from "@/features/doctors/data/mockDoctors";\n\ntype DoctorFilter =')
start = s.index('    params: {', s.index('function getDoctorProfileRoute'))
end = s.index('\n    },', start) + len('\n    },')
s = s[:start] + '    params: { id: doctor.id, consultationType },' + s[end:]
write(p, s)

p = 'app/(app)/doctor/[id].tsx'
s = read(p)
s = re.sub(r'type DoctorProfileParams = \{.*?\n};', 'type DoctorProfileParams = {\n  id: string;\n  consultationType?: string | string[];\n};', s, flags=re.S)
s = re.sub(r'  const doctor = \{.*?\n  };', '  const doctor = doctors.find((item) => item.id === params.id);\n  if (!doctor) return <Redirect href="/doctor/search" />;', s, flags=re.S)
s = s.replace('import { router,', 'import { Redirect, router,')
s = 'import { doctors } from "@/features/doctors/data/mockDoctors";\n' + s
write(p, s)

# Keep consultation mode policy outside the route layer.
p = 'app/(app)/visit/[id].tsx'
s = read(p)
policy = re.search(r'function getSessionMode\(.*?\n}', s, re.S).group()
write('features/consultations/utils/sessionMode.ts', 'import type { ConsultationType, VisitSessionMode } from "@/types/appointment";\n\nexport '+policy+'\n')
s = s.replace(policy+'\n\n', '')
s = s.replace('  ConsultationType,\n', '')
s = 'import { getSessionMode } from "@/features/consultations/utils/sessionMode";\n'+s
write(p, s)

# Doctor search header and static discovery options.
p = 'features/doctors/screens/DoctorSearchScreen.tsx'
s = read(p)
symptoms = re.search(r'const symptoms = \[.*?\n\] as const;', s, re.S).group()
categories = re.search(r'type DoctorCategory = \{.*?\n\];', s, re.S).group()
write('features/doctors/data/discovery.ts', 'import { Activity, Baby, Bean, Bone, Brain, Droplets, Ear, Eye, HeartPulse, Mars, ShieldCheck, Sparkles, Stethoscope, Venus, Wind, type LucideIcon } from "lucide-react-native";\n\n'+symptoms.replace('const symptoms', 'export const symptoms')+'\n\n'+categories.replace('const categories', 'export const categories')+'\n')
s = s.replace(symptoms+'\n\n', '').replace(categories+'\n\n', '')
header = re.search(r'type FindDoctorHeaderProps = \{.*?\n}\n\n(?=export function)', s, re.S).group()
header = header.replace('FindDoctorHeader', 'DoctorSearchHeader').replace('function DoctorSearchHeader', 'export function DoctorSearchHeader')
s = re.sub(r'type FindDoctorHeaderProps = \{.*?\n}\n\n(?=export function)', '', s, flags=re.S)
s, styles = take_style(s, ['headerRow', 'backButton', 'backButtonPressed', 'headerSearch', 'searchInput'])
write('features/doctors/components/DoctorSearchHeader.tsx', 'import { LinearGradient } from "expo-linear-gradient";\nimport { Pressable, StyleSheet, View } from "react-native";\nimport { ChevronLeft, Mic } from "lucide-react-native";\nimport { colors, fontFamilies, gradients, shadows, spacing } from "@startup/design-tokens";\nimport { SafeAreaView, SearchInput } from "@startup/mobile-ui";\n\n'+header+'const styles = StyleSheet.create({\n'+styles+'});\n')
s = re.sub(r'import \{\n  Activity,.*?\n\} from "lucide-react-native";\n', '', s, flags=re.S)
s = s.replace('import { LinearGradient } from "expo-linear-gradient";\n', '').replace('Pressable, ', '').replace('  gradients,\n', '').replace('  SafeAreaView,\n', '').replace('  SearchInput,\n', '')
s = s.replace('<FindDoctorHeader', '<DoctorSearchHeader')
s = 'import { DoctorSearchHeader } from "@/features/doctors/components/DoctorSearchHeader";\nimport { symptoms, categories } from "@/features/doctors/data/discovery";\n'+s
write(p, s)

# Home motion belongs to a feature hook; Home stays a screen composition.
p = 'features/home/screens/HomeScreen.tsx'
s = read(p)
constants = re.search(r'const EXPANDED_HEADER_HEIGHT.*?CONTENT_TOP =\n.*?;', s, re.S).group()
constants = constants.replace('const ', 'export const ')
write('features/home/data/homeLayout.ts', constants+'\n')
s = s.replace(re.search(r'const EXPANDED_HEADER_HEIGHT.*?CONTENT_TOP =\n.*?;', s, re.S).group()+'\n\n', '')
start = s.index('  const { top: topInset }')
end = s.index('\n  return (', start)
hookbody = s[start:end]
write('features/home/hooks/useCollapsingHeader.ts', 'import { useRef } from "react";\nimport { Animated } from "react-native";\nimport { useSafeAreaInsets } from "react-native-safe-area-context";\nimport { COLLAPSED_HEADER_HEIGHT, COLLAPSE_DISTANCE, EXPANDED_HEADER_HEIGHT, SEARCH_OVERLAP } from "../data/homeLayout";\n\nexport function useCollapsingHeader() {\n'+hookbody+'\n  return { collapsedHeight, expandedHeaderStyle, searchStyle, onScroll: Animated.event(\n    [{ nativeEvent: { contentOffset: { y: scrollY } } }],\n    { useNativeDriver: false }\n  ) };\n}\n')
s = s[:start]+'  const header = useCollapsingHeader();\n'+s[end:]
start = s.index('      <LinearGradient')
end = s.index('      <FadedScrollView', start)
markup = s[start:end].replace('collapsedHeight', 'header.collapsedHeight').replace('expandedHeaderStyle', 'header.expandedHeaderStyle').replace('searchStyle', 'header.searchStyle')
s = s[:start]+'      <HomeSearchHeader header={header} />\n\n'+s[end:]
s, styles = take_style(s, ['collapsedHeader', 'expandedHeader', 'safeArea', 'headerRow', 'greeting', 'notificationButton', 'searchWrap', 'search', 'searchInput'])
write('features/home/components/HomeSearchHeader.tsx', 'import { Animated, StyleSheet, Text, View } from "react-native";\nimport { LinearGradient } from "expo-linear-gradient";\nimport { Bell } from "lucide-react-native";\nimport { colors, fontFamilies, gradients, shadows } from "@startup/design-tokens";\nimport { SafeAreaView, SearchInput } from "@startup/mobile-ui";\nimport { EXPANDED_HEADER_HEIGHT, SEARCH_OVERLAP, SEARCH_HEIGHT } from "../data/homeLayout";\nimport type { useCollapsingHeader } from "../hooks/useCollapsingHeader";\n\ntype HomeSearchHeaderProps = { header: ReturnType<typeof useCollapsingHeader> };\n\nexport function HomeSearchHeader({ header }: HomeSearchHeaderProps) {\n  return (<>\n'+markup+'  </>);\n}\n\nconst styles = StyleSheet.create({\n'+styles+'});\n')
s = re.sub(r'        onScroll=\{Animated.event\(.*?\n        \)\}', '        onScroll={header.onScroll}', s, flags=re.S)
s = s.replace('topEdgeOffset={collapsedHeight}', 'topEdgeOffset={header.collapsedHeight}')
# Extract the Home action row; screen still chooses navigation behavior.
start = s.index('        <View style={styles.actionsRow}>')
end = s.index('\n\n        <View style={styles.ambulanceBanner}>', start)
actions = s[start:end]
actions = re.sub(r'onPress=\{\n.*?\n              \}', 'onPress={action.consultationType ? () => onSelectConsultation(action.consultationType!) : undefined}', actions, flags=re.S)
s = s[:start]+'        <HomeActions onSelectConsultation={(type) => router.push(getFindDoctorRoute(type))} />'+s[end:]
s, styles = take_style(s, ['actionsRow', 'actionLabel'])
write('features/home/components/HomeActions.tsx', 'import { StyleSheet, View } from "react-native";\nimport { colors, fontFamilies } from "@startup/design-tokens";\nimport { IconLabel } from "@startup/mobile-ui";\nimport { homeActions } from "../data/homeActions";\nimport type { ConsultationType } from "@/types/appointment";\n\nexport function HomeActions({ onSelectConsultation }: { onSelectConsultation: (type: ConsultationType) => void }) {\n  return (\n'+actions+'\n  );\n}\n\nconst styles = StyleSheet.create({\n'+styles+'});\n')
s = s.replace('import { useRef } from "react";\n', '').replace('Animated, ', '').replace('Text, ', '')
for line in ('import { LinearGradient } from "expo-linear-gradient";\n', 'import { useSafeAreaInsets } from "react-native-safe-area-context";\n', 'import { Bell } from "lucide-react-native";\n', 'import { homeActions } from "@/features/home/data/homeActions";\n'):
    s = s.replace(line, '')
s = re.sub(r'import \{\n  colors,.*?\n\} from "@startup/design-tokens";', 'import { colors } from "@startup/design-tokens";', s, flags=re.S)
s = s.replace('  IconLabel,\n', '').replace('  SafeAreaView,\n', '').replace('  SearchInput,\n', '')
s = 'import { HomeSearchHeader } from "@/features/home/components/HomeSearchHeader";\nimport { HomeActions } from "@/features/home/components/HomeActions";\nimport { useCollapsingHeader } from "@/features/home/hooks/useCollapsingHeader";\nimport { CONTENT_TOP } from "@/features/home/data/homeLayout";\n'+s
s = s.replace('...StyleSheet.absoluteFill,', '...StyleSheet.absoluteFillObject,')
write(p, s)

for name, component in [('login', 'LoginScreen'), ('onboarding', 'OnboardingScreen')]:
    write(f'features/auth/screens/{component}.tsx', f'export function {component}() {{\n  return null;\n}}\n')
    write(f'app/(auth)/{name}.tsx', f'export {{ {component} as default }} from "@/features/auth/screens/{component}";\n')

print('Extracted feature headers, Home motion/actions, doctor discovery data, and auth screens.')
