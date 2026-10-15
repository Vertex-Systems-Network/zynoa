import type { Meta, StoryObj } from "@storybook/react-vite";
import { Button, EmptyState } from "../src/index";

const meta = {
  title: "Components/EmptyState",
  component: EmptyState,
} satisfies Meta<typeof EmptyState>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    title: "No projects yet",
    description: "Create your first project to get started.",
    action: <Button size="sm">Create project</Button>,
  },
};
