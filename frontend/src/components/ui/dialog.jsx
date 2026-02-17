import { Dialog as ChakraDialog } from "@chakra-ui/react";
import { forwardRef } from "react";

export const DialogRoot = ChakraDialog.Root;
export const DialogTrigger = ChakraDialog.Trigger;
export const DialogContent = forwardRef((props, ref) => (
  <ChakraDialog.Backdrop>
    <ChakraDialog.Positioner>
      <ChakraDialog.Content ref={ref} {...props} />
    </ChakraDialog.Positioner>
  </ChakraDialog.Backdrop>
));
export const DialogHeader = ChakraDialog.Header;
export const DialogTitle = ChakraDialog.Title;
export const DialogDescription = ChakraDialog.Description;
export const DialogBody = ChakraDialog.Body;
export const DialogFooter = ChakraDialog.Footer;
export const DialogCloseTrigger = ChakraDialog.CloseTrigger;
export const DialogActionTrigger = ChakraDialog.ActionTrigger;
