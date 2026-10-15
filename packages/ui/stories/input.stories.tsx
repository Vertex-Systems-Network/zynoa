import type { Meta, StoryObj } from "@storybook/react-vite";
import { Input } from "../src/index";

const meta = {
  title: "Components/Input",
  component: Input,
  args: { placeholder: "you@example.com", "aria-label": "Email" },
} satisfies Meta<typeof Input>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
export const Disabled: Story = { args: { disabled: true } };
