import type { ConsultationType } from "../../appointments/types/appointment";
import type { PatientScreenProps } from "../../../types/screen";

export type FindDoctorScreenProps = PatientScreenProps & {
  consultationType: ConsultationType;
  onBackPress?: () => void;
};

import type { ImageSourcePropType } from "react-native";

export type DoctorCategory = {
  key: string;
  label: string;
  image: ImageSourcePropType;
  imageScale?: number;
};
