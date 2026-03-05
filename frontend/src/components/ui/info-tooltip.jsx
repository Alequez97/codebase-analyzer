import { Icon } from "@chakra-ui/react";
import { Info } from "lucide-react";
import { Tooltip } from "./tooltip";

export function InfoTooltip({ label, size = 14, color = "gray.400" }) {
  if (!label) return null;
  return (
    <Tooltip content={label} showArrow>
      <Icon color={color} cursor="help" display="inline-flex">
        <Info size={size} />
      </Icon>
    </Tooltip>
  );
}
