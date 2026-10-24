import { memo } from "react";
import { Copy } from "../../../components/DriverUI";
import { ui } from "../../../components/theme";

export const ChatHeader = memo(function ChatHeader() {
  return (
    <Copy style={[ui.caption, { textAlign: "center", marginBottom: 4 }]}>
      TODAY · EMERGENCY REQUEST
    </Copy>
  );
});
