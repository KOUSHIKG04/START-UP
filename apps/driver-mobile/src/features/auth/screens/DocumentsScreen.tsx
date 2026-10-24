import { useRegistrationDocuments } from "../hooks/useRegistrationDocuments";
import type { DocumentsScreenProps } from "../types/documents-screen";

import { Pressable, ScrollView, Text, View } from "react-native";
import { Button, Input } from "@startup/mobile-ui";
import { Check } from "lucide-react-native";

import { s } from "../components/Registration.styles";
import { Frame } from "../components/RegistrationFrame";
import { teal, documentTypes } from "../utils/registrationConstants";

import { vehicleClassOptions } from "../utils/registrationConstants";

export function DocumentsScreen({
  onSubmit,
  onBack,
  initialDocuments,
}: DocumentsScreenProps) {
  const {
    classification,
    setClassification,
    registration,
    setRegistration,
    files,
    picking,
    submitting,
    pick,
    submit,
  } = useRegistrationDocuments({ onSubmit, onBack, initialDocuments });
  return (
    <Frame title="Vehicle & documents" onBack={onBack}>
      <ScrollView
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={s.documentContent}
      >
        <Text style={s.sectionTitle}>Ambulance classification</Text>
        <View style={s.classifications}>
          {vehicleClassOptions.map(({ id, label, icon: Icon }) => (
            <Pressable
              key={id}
              accessibilityRole="radio"
              accessibilityState={{ selected: classification === id }}
              onPress={() => setClassification(id)}
              style={[
                s.classification,
                classification === id && s.classificationSelected,
              ]}
            >
              <View style={s.classTop}>
                <Text
                  style={[s.rowTitle, classification === id && s.selectedText]}
                >
                  {id}
                </Text>
                <Icon size={22} color={teal} />
              </View>
              <Text style={s.caption}>{label}</Text>
            </Pressable>
          ))}
        </View>
        <Input
          label="Registration number"
          value={registration}
          onChangeText={setRegistration}
          autoCapitalize="characters"
          placeholder="KA 01 AB 1001"
          containerStyle={s.registrationInput}
          labelStyle={s.sectionTitle}
          style={s.input}
        />
        <Text style={s.sectionTitle}>Required documents</Text>
        <View style={s.documentGrid}>
          {documentTypes.map((doc) => (
            <Button
              loading={picking === doc.name}
              variant="ghost"
              label={doc.name}
              key={doc.name}
              onPress={() => pick(doc)}
              disabled={picking !== null}
              accessibilityRole="button"
              accessibilityLabel={`${files[doc.name] ? "Replace" : "Add"} ${doc.name}`}
              style={[s.documentTile, files[doc.name] && s.documentAdded]}
            >
              <View style={s.smallIcon}>
                <doc.icon size={19} color={teal} />
              </View>
              <View style={s.flex}>
                <Text style={s.docTitle}>{doc.name}</Text>
                <Text
                  numberOfLines={1}
                  style={[s.caption, files[doc.name] && s.teal]}
                >
                  {picking === doc.name
                    ? "Opening…"
                    : files[doc.name]
                      ? "File selected"
                      : "Add file"}
                </Text>
              </View>
              {files[doc.name] && <Check size={13} color={teal} />}
            </Button>
          ))}
        </View>
        <Text style={s.fileHelp}>
          PDF, JPG or PNG up to 10 MB. Photos must be JPG or PNG.
        </Text>
        <View style={s.documentFooter}>
          <Button
            loading={submitting}
            theme="driver"
            label="Submit for Verification"
            disabled={picking !== null || submitting}
            onPress={() => void submit()}
          />
        </View>
      </ScrollView>
    </Frame>
  );
}
