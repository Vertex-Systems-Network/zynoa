import type { Meta, StoryObj } from "@storybook/react-vite";
import { Button, Toaster, toast } from "../src/index";

const meta = { title: "Components/Toast", component: Toaster } satisfies Meta<typeof Toaster>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: () => (
    <>
      <div className="flex gap-2">
        <Button onClick={() => toast({ title: "Saved", description: "All changes stored." })}>
          Notify
        </Button>
        <Button variant="danger" onClick={() => toast({ title: "Run failed", variant: "danger" })}>
          Fail
        </Button>
      </div>
      <Toaster />
    </>
  ),
};
