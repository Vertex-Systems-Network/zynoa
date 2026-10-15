import type { Meta, StoryObj } from "@storybook/react-vite";
import { Badge } from "../src/index";

const meta = {
  title: "Components/Badge",
  component: Badge,
} satisfies Meta<typeof Badge>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Variants: Story = {
  render: () => (
    <div className="flex items-center gap-2">
      <Badge variant="neutral">Draft</Badge>
      <Badge variant="brand">Beta</Badge>
      <Badge variant="success">Active</Badge>
      <Badge variant="warning">Pending</Badge>
      <Badge variant="danger">Failed</Badge>
    </div>
  ),
};
