import type { ComponentProps } from "react";
import { CardHeader } from "@/components/ui";

export { Card, Button, ErrorNotice, InfoNotice, Spinner } from "@/components/ui";
export { CardHeader };

export function FichaCardHeader(props: ComponentProps<typeof CardHeader>) {
  return <CardHeader {...props} titleClassName="text-action-primary" />;
}