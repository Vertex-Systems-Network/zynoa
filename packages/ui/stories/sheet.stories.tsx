import type { Meta, StoryObj } from "@storybook/react-vite";
import {
  Button,
  Sheet,
  SheetContent,
  SheetDescription,
  SheetTitle,
  SheetTrigger,
} from "../src/index";

const meta = { title: "Components/Sheet", component: Sheet } satisfies Meta<typeof Sheet>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Right: Story = {
  render: () => (
    <Sheet>
      <SheetTrigger asChild>
        <Button variant="secondary">Open details</Button>
      </SheetTrigger>
      <SheetContent side="right">
        <SheetTitle>Job details</SheetTitle>
        <SheetDescription>Status, cost and evidence for this run.</SheetDescription>
      </SheetContent>
    </Sheet>
  ),
};
