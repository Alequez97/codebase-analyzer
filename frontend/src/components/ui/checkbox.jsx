import { forwardRef } from "react";

export const Checkbox = forwardRef((props, ref) => {
  const { children, ...rest } = props;
  return (
    <ChakraCheckbox.Root ref={ref} {...rest}>
      <ChakraCheckbox.HiddenInput />
      <ChakraCheckbox.Control>
        <ChakraCheckbox.Indicator />
      </ChakraCheckbox.Control>
      {children && <ChakraCheckbox.Label>{children}</ChakraCheckbox.Label>}
    </ChakraCheckbox.Root>
  );
});

Checkbox.displayName = "Checkbox";
